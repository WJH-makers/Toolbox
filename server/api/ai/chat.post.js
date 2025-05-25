import {defineEventHandler, readBody, createError} from 'h3';
import OpenAI from "openai";
import prisma from '~/server/utils/prisma';

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
const DEEPSEEK_BASE_URL = 'https://api.deepseek.com/v1';
let openai;

if (DEEPSEEK_API_KEY) {
    openai = new OpenAI({
        baseURL: DEEPSEEK_BASE_URL,
        apiKey: DEEPSEEK_API_KEY,
    });
} else {
    console.error('AI Chat API FATAL ERROR: DEEPSEEK_API_KEY is not defined in .env');
}

export default defineEventHandler(async (event) => {
    if (!openai) {
        throw createError({
            statusCode: 500,
            statusMessage: 'AI Service Not Configured',
            message: 'AI服务未配置，请检查API密钥。'
        });
    }
    if (!event.context.auth || !event.context.auth.userId) {
        throw createError({statusCode: 401, statusMessage: 'Unauthorized', message: '用户未认证，无法使用AI助手。'});
    }
    const userId = event.context.auth.userId;

    const body = await readBody(event);
    let clientMessagesForContext = body.messages;
    const sessionId = body.sessionId;
    const requestedModel = body.model || 'deepseek-chat';

    if (!sessionId) {
        throw createError({statusCode: 400, statusMessage: 'Bad Request', message: '未提供会话ID (sessionId)。'});
    }
    if (!clientMessagesForContext || !Array.isArray(clientMessagesForContext) || clientMessagesForContext.length === 0) {
        throw createError({statusCode: 400, statusMessage: 'Bad Request', message: '未提供消息内容。'});
    }

    const session = await prisma.aiChatSession.findFirst({
        where: {id: sessionId, userId: userId}
    });
    if (!session) {
        throw createError({statusCode: 404, statusMessage: 'Not Found', message: '会话未找到或无权访问。'});
    }

    const latestUserMessageToSave = clientMessagesForContext.findLast(msg => msg.role === 'user');

    try {
        if (latestUserMessageToSave && latestUserMessageToSave.content) {
            await prisma.aiChatMessage.create({
                data: {sessionId: sessionId, role: 'user', content: latestUserMessageToSave.content}
            });
            await prisma.aiChatSession.update({where: {id: sessionId}, data: {updatedAt: new Date()}});
        }

        if (requestedModel === 'deepseek-reasoner') {
            if (!clientMessagesForContext.length || clientMessagesForContext[0].role !== 'user') {
                throw createError({
                    statusCode: 400,
                    statusMessage: 'Bad Request',
                    message: `模型 ${requestedModel} 要求提供的对话历史必须以用户消息开始。请检查前端发送的上下文。`
                });
            }
            for (let i = 0; i < clientMessagesForContext.length - 1; i++) {
                if (clientMessagesForContext[i].role === clientMessagesForContext[i + 1].role) {
                    console.error(`[AI Chat Backend - ${requestedModel}] Error: Successive messages with role '${clientMessagesForContext[i].role}' detected at indices ${i} and ${i + 1} in clientMessagesForContext.`);
                    console.error('[AI Chat Backend] Client messages causing error:', JSON.stringify(clientMessagesForContext.slice(i, i + 2), null, 2));
                    throw createError({
                        statusCode: 400,
                        statusMessage: 'Bad Request',
                        message: `模型 ${requestedModel} 不支持连续的同角色消息。在位置 ${i} 和 ${i + 1} 检测到连续的 '${clientMessagesForContext[i].role}' 消息。请确保用户和助手消息交替出现。`
                    });
                }
            }
        }

        const messagesForApi = [
            {role: "system", content: "你是一个乐于助人的万能助手。请使用Markdown格式进行回复。"},
            ...clientMessagesForContext
        ];

        console.log(`[AI Chat Backend] Requesting stream from DeepSeek API with model: ${requestedModel}, num_messages_to_api: ${messagesForApi.length}`);
        const streamFromAI = await openai.chat.completions.create({
            messages: messagesForApi,
            model: requestedModel,
            stream: true,
        });

        let accumulatedAssistantResponse = "";

        // --- 修正 ReadableStream 的构造 ---
        const readableStream = new ReadableStream({
            async start(controller) {
                try {
                    for await (const chunk of streamFromAI) {
                        const contentDelta = chunk.choices[0]?.delta?.content;
                        if (contentDelta) {
                            accumulatedAssistantResponse += contentDelta;
                            controller.enqueue(new TextEncoder().encode(contentDelta));
                        }
                        if (chunk.choices[0]?.finish_reason === 'stop' || chunk.choices[0]?.finish_reason === 'length') {
                            if (accumulatedAssistantResponse.trim()) {
                                await prisma.aiChatMessage.create({
                                    data: {
                                        sessionId: sessionId,
                                        role: 'assistant',
                                        content: accumulatedAssistantResponse.trim()
                                    }
                                });
                                await prisma.aiChatSession.update({
                                    where: {id: sessionId},
                                    data: {updatedAt: new Date()}
                                });
                            }
                        }
                    }
                    controller.close();
                } catch (streamError) {
                    console.error('处理AI返回的流时出错:', streamError);
                    controller.error(streamError);
                    if (accumulatedAssistantResponse.trim()) {
                        try {
                            await prisma.aiChatMessage.create({
                                data: {
                                    sessionId: sessionId,
                                    role: 'assistant',
                                    content: accumulatedAssistantResponse.trim() + " [流中断]"
                                }
                            });
                            await prisma.aiChatSession.update({where: {id: sessionId}, data: {updatedAt: new Date()}});
                        } catch (dbErrorInner) {
                            console.error("流中断后保存AI部分聊天消息到数据库失败:", dbErrorInner);
                        }
                    }
                }
            }
        });

        event.node.res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        event.node.res.setHeader('Transfer-Encoding', 'chunked');
        event.node.res.setHeader('X-Accel-Buffering', 'no');
        return readableStream;

    } catch (error) {
        console.error(`调用 DeepSeek API (model: ${requestedModel}) 失败:`, error.response ? error.response.data : (error.data || error.message), error.status || error.statusCode);
        let errorMessage = '与AI助手通信时发生错误。';
        if (error.data && error.data.message) {
            errorMessage = error.data.message;
        } else if (error.response && error.response.data && error.response.data.error && error.response.data.error.message) {
            errorMessage = `AI服务错误: ${error.response.data.error.message}`;
        } else if (error.status === 401 || error.statusCode === 401) {
            errorMessage = 'AI服务认证失败，请检查API密钥配置。';
        } else if (error.message) {
            errorMessage = error.message;
        }
        throw createError({
            statusCode: error.status || error.statusCode || 500,
            statusMessage: error.statusMessage || 'AI Service Error',
            message: errorMessage,
        });
    }
});
