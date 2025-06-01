import {createError, defineEventHandler, readBody} from 'h3';
import OpenAI from "openai";
import prisma from '~/server/utils/prisma';

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
const DEEPSEEK_BASE_URL = process.env.DEEPSEEK_BASE_URL;

let openaiInstance;
if (DEEPSEEK_API_KEY && DEEPSEEK_BASE_URL) {
    openaiInstance = new OpenAI({baseURL: DEEPSEEK_BASE_URL, apiKey: DEEPSEEK_API_KEY});
}

export default defineEventHandler(async (event) => {
    if (!openaiInstance) {
        throw createError({
            statusCode: 500,
            statusMessage: 'AI Service Error',
            message: 'AI服务未正确配置，请检查环境变量。'
        });
    }

    const body = await readBody(event);
    const gameBoard = body.board;
    const currentScore = body.score || 0;
    const numMovesRequested = parseInt(body.numMoves) || 1;

    if (!gameBoard || !Array.isArray(gameBoard) || gameBoard.length !== 4 || !gameBoard.every(row => Array.isArray(row) && row.length === 4)) {
        throw createError({statusCode: 400, statusMessage: 'Bad Request', message: '未提供有效的4x4棋盘数据。'});
    }

    let boardRepresentation = "当前2048棋盘状态 (0代表空格):\n";
    gameBoard.forEach(row => {
        boardRepresentation += row.map(cell => String(cell).padStart(5, ' ')).join(' | ') + '\n';
    });
    boardRepresentation += `当前得分: ${currentScore}\n`;
    boardRepresentation += `游戏规则: 通过上、下、左、右移动来合并相同的数字方块。目标是达到2048方块。每次有效移动后，棋盘空格中会随机出现一个新的2或4方块。\n`;

    const systemPromptMain = `你是世界顶级的 2048 游戏 AI 策略专家。你的任务是分析所提供的棋盘状态和分数，然后推荐最优的接下来 ${numMovesRequested} 个连续移动，并为这些移动提供一个简洁的理由。

你的回答必须严格遵守以下两段式格式：
1.  **移动指令行：** 第一行必须仅包含逗号分隔的移动指令序列。每个指令必须是 'UP'、'DOWN'、'LEFT' 或 'RIGHT' 之一（大写）。
    * 请求1个移动的示例：\`UP\`
    * 请求3个移动的示例：\`UP,LEFT,DOWN\`
    * 如果已无更多有效移动（游戏结束）：\`GAMEOVER\`
    * 如果已达到 2048 方块（或更高，如4096）（胜利条件）：\`WIN\`
    此行不得包含任何其他文本、解释或换行符。

2.  **理由行：** 紧随移动指令行之后，另起一行，提供你的理由。此行必须以 "REASON: " 开头（注意冒号后的空格）。理由应当是对所推荐移动背后战略思路的清晰、简洁的解释。
    * 理由示例：\`REASON: 此序列旨在将高分值方块整合到左上角，合并可配对的方块，并为新方块创造空间，从而改善整体棋盘结构。\`
    * GAMEOVER 时的理由示例：\`REASON: 棋盘已被锁定，无法进行更多有效移动。\`
    * WIN 时的理由示例：\`REASON: 已成功达到目标方块（2048或更高）。\`

一个针对 ${numMovesRequested} 个移动的完整有效响应示例如下：
\`此处为移动指令\`
\`REASON: 此处为你的简洁战略解释。\`

请务必确保你的输出严格遵循这种两段式格式。
第一行只输出指令序列，第二行只输出以 "REASON: " 开头的理由。
不得包含任何其他文本、段内换行或引言/结束语。
确保理由具有洞察力，并与提议的移动和当前棋盘状态直接相关。
`;

    const messagesForApi = [];
    messagesForApi.push({role: "system", content: systemPromptMain});

    let experienceExamplesPromptPart = "";
    try {
        const bestExperiences = await prisma.ai2048Experience.findMany({
            orderBy: [{scoreAchieved: 'desc'}, {highestTile: 'desc'}, {createdAt: 'desc'}],
            take: 2
        });

        if (bestExperiences.length > 0) {
            experienceExamplesPromptPart = "\n\n以下是一些成功的过往游戏序列及其结果，供您参考（分数/最大方块值越高通常越好）。请从这些模式中学习：\n";
            bestExperiences.forEach((exp, index) => {
                let initialBoardStr = "初始棋盘数据不完整或已损坏。";
                try {
                    const parsedInitial = JSON.parse(exp.initialBoardStateJson);
                    if (Array.isArray(parsedInitial)) {
                        initialBoardStr = parsedInitial.map(r => Array.isArray(r) ? r.map(c => String(c).padStart(5, ' ')).join(' | ') : '无效行').join('\n');
                    }
                } catch { /* 解析错误，保留默认消息 */
                }

                let finalBoardStr = "最终棋盘数据不完整或已损坏。";
                try {
                    const parsedFinal = JSON.parse(exp.finalBoardStateJson);
                    if (Array.isArray(parsedFinal)) {
                        finalBoardStr = parsedFinal.map(r => Array.isArray(r) ? r.map(c => String(c).padStart(5, ' ')).join(' | ') : '无效行').join('\n');
                    }
                } catch { /* 解析错误，保留默认消息 */
                }

                let movesStr = "移动序列数据不完整或已损坏。";
                try {
                    const parsedMoves = JSON.parse(exp.moveSequenceJson);
                    if (Array.isArray(parsedMoves)) {
                        movesStr = parsedMoves.join(',');
                    }
                } catch { /* 解析错误，保留默认消息 */
                }

                experienceExamplesPromptPart += `--- 示例 ${index + 1} (得分: ${exp.scoreAchieved}, 最大方块: ${exp.highestTile}, 步数: ${exp.numberOfMoves}) ---\n`;
                experienceExamplesPromptPart += `初始棋盘状态:\n${initialBoardStr}\n`;
                experienceExamplesPromptPart += `应用的移动序列: ${movesStr}\n`;
                experienceExamplesPromptPart += `最终棋盘状态 (经过 ${exp.numberOfMoves} 步后):\n${finalBoardStr}\n`;
                if (exp.notes) experienceExamplesPromptPart += `结果/关键策略说明: ${exp.notes}\n`;
                experienceExamplesPromptPart += `--- 示例 ${index + 1} 结束 ---\n\n`;
            });
            messagesForApi.push({
                role: "system",
                content: experienceExamplesPromptPart + "现在，请仔细分析用户提供的当前游戏状态，并同时参考以上成功示例以及通用的2048游戏策略。"
            });
        }
    } catch (dbError) {
        console.error("[2048 AI Assistant] Error fetching AI experiences from DB:", dbError.message, dbError.stack);
    }

    messagesForApi.push({
        role: "user",
        content: `${boardRepresentation}基于当前的棋盘局面，请严格遵循系统提示中指定的两段式格式，提供推荐的接下来 ${numMovesRequested} 个移动指令序列以及相应的简洁理由。`
    });

    try {
        const completion = await openaiInstance.chat.completions.create({
            messages: messagesForApi,
            model: 'deepseek-chat',
            temperature: 0.05,
            max_tokens: 250,
        });

        let aiFullResponseText = completion.choices[0]?.message?.content?.trim() || "ERROR:NO_RESPONSE";
        const parts = aiFullResponseText.split('\n');
        if (parts.length < 1 || !parts[0].trim()) {
            aiFullResponseText = "ERROR:INVALID_FORMAT_MOVES_MISSING";
        }
        event.node.res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        return aiFullResponseText;

    } catch (error) {
        let errorMessage = '与2048 AI助手通信时发生未知错误。';
        let errorStatusCode = 500;

        if (error instanceof OpenAI.APIError) {
            errorMessage = `AI服务接口错误: ${error.message} (状态码: ${error.status})`;
            errorStatusCode = error.status || 500;
        } else {
            errorMessage = error.message || errorMessage;
        }

        throw createError({
            statusCode: errorStatusCode,
            statusMessage: 'AI Service Error',
            message: errorMessage,
            data: {type: error.constructor.name}
        });
    }
});