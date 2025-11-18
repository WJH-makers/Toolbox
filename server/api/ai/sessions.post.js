import {defineEventHandler, readBody, createError} from 'h3';
import prisma from '~/server/utils/prisma';

export default defineEventHandler(async (event) => {
    if (!event.context.auth || !event.context.auth.userId) {
        throw createError({statusCode: 401, statusMessage: 'Unauthorized'});
    }
    const userId = event.context.auth.userId;
    const body = await readBody(event);
    const title = (body.title || `新对话 - ${new Date().toLocaleString('zh-CN', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    })}`).replace(/<[^>]*>?/gm, '');

    try {
        const newSession = await prisma.aiChatSession.create({
            data: {
                userId: userId,
                title: title,
            }
        });

        await prisma.aiChatMessage.create({
            data: {
                sessionId: newSession.id,
                role: 'assistant',
                content: '你好！这是一个新的对话，有什么可以帮助你的吗？'
            }
        });

        const sessionWithInitialMessage = await prisma.aiChatSession.findUnique({
            where: {id: newSession.id},
            include: {messages: {orderBy: {createdAt: 'asc'}}}
        });

        return {success: true, data: sessionWithInitialMessage};
    } catch (error) { // eslint-disable-line no-unused-vars
        throw createError({statusCode: 500, statusMessage: 'Internal Server Error'});
    }
});