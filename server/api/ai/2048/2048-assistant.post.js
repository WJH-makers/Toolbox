// server/api/ai/2048-assistant.post.js
import {defineEventHandler, readBody, createError} from 'h3';
import OpenAI from "openai";
import prisma from '~/server/utils/prisma';

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
const DEEPSEEK_BASE_URL = process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com/v1';

let openaiInstance;
if (DEEPSEEK_API_KEY) {
    openaiInstance = new OpenAI({baseURL: DEEPSEEK_BASE_URL, apiKey: DEEPSEEK_API_KEY});
} else {
    console.error('AI Assistant API FATAL ERROR: DEEPSEEK_API_KEY is not defined in .env');
}

export default defineEventHandler(async (event) => {
    if (!openaiInstance) {
        throw createError({statusCode: 500, message: 'AI服务未配置。'});
    }
    const body = await readBody(event);
    const gameBoard = body.board;
    const currentScore = body.score || 0;
    const numMovesRequested = parseInt(body.numMoves) || 1;

    if (!gameBoard) {
        throw createError({statusCode: 400, message: '未提供有效的4x4棋盘数据。'});
    }

    let boardRepresentation = "Current 2048 board state (0 represents empty space):\n";
    gameBoard.forEach(row => {
        boardRepresentation += row.map(cell => String(cell).padStart(5, ' ')).join(' | ') + '\n';
    });
    boardRepresentation += `Current score: ${currentScore}\n`;
    boardRepresentation += `Game rules: Merge identical number tiles. Goal 2048. New 2 or 4 tile appears randomly after a move.\n`;


    const systemPromptMain = `You are a top-tier 2048 game AI strategy analyst. Based on the current board state and score, predict and recommend the optimal next ${numMovesRequested} consecutive moves.
Your response MUST strictly be a comma-separated sequence of move commands. Do NOT include any other text, explanations, reasons, newlines, or unnecessary spaces (except for the comma separator).
Each move command must be one of 'UP', 'DOWN', 'LEFT', or 'RIGHT', and must be uppercase.
If only one move is requested (numMovesRequested = 1), return a single command. Example for 1 move: UP
If multiple moves are requested (e.g., numMovesRequested = 3), an example is: UP,LEFT,DOWN
If game over because no more moves are possible: GAMEOVER
If the 2048 tile has been achieved (win condition): WIN
Absolutely output ONLY the command sequence or GAMEOVER/WIN.`;

    const messagesForApi = [];
    messagesForApi.push({role: "system", content: systemPromptMain});

    // 从数据库加载AI的最佳全局经验作为 few-shot examples
    let experienceExamplesPromptPart = "";
    try {
        const bestExperiences = await prisma.ai2048Experience.findMany({
            orderBy: [{scoreAchieved: 'desc'}, {highestTile: 'desc'}, {createdAt: 'desc'}],
            take: 2 // 取最好的2条经验
        });

        if (bestExperiences.length > 0) {
            experienceExamplesPromptPart = "\n\nHere are some examples of successful past game sequences for your reference (higher score/tile is better):\n";
            bestExperiences.forEach((exp, index) => {
                let initialBoardStr = "Initial board not available";
                try {
                    initialBoardStr = JSON.parse(exp.initialBoardStateJson).map(r => r.map(c => String(c).padStart(5, ' ')).join(' | ')).join('\n');
                } catch {
                }

                let finalBoardStr = "Final board not available";
                try {
                    finalBoardStr = JSON.parse(exp.finalBoardStateJson).map(r => r.map(c => String(c).padStart(5, ' ')).join(' | ')).join('\n');
                } catch {
                }

                let movesStr = "Unknown moves";
                try {
                    movesStr = JSON.parse(exp.moveSequenceJson).join(',');
                } catch {
                }

                experienceExamplesPromptPart += `--- Example ${index + 1} (Score: ${exp.scoreAchieved}, MaxTile: ${exp.highestTile}) ---\n`;
                experienceExamplesPromptPart += `Initial Board State:\n${initialBoardStr}\n`;
                experienceExamplesPromptPart += `Move Sequence Taken: ${movesStr}\n`;
                experienceExamplesPromptPart += `Resulting Final Board State:\n${finalBoardStr}\n`;
                if (exp.notes) experienceExamplesPromptPart += `Outcome/Notes: ${exp.notes}\n`;
                experienceExamplesPromptPart += `--- End Example ${index + 1} ---\n\n`;
            });

        }
    } catch (dbError) {
        console.error("[2048 AI Assistant] Error fetching global AI experiences from DB:", dbError);
    }

    // 如果有经验示例，将其作为一条系统消息添加到提示中
    if (experienceExamplesPromptPart) {
        messagesForApi.push({
            role: "system",
            content: experienceExamplesPromptPart + "Now, considering the current game state based on the rules and these examples:"
        });
    }

    messagesForApi.push({
        role: "user",
        content: `${boardRepresentation}Strictly provide the recommended next ${numMovesRequested} move command(s) in the specified format.`
    });

    try {
        console.log(`[2048 AI Assistant] Requesting ${numMovesRequested} moves. Prompt includes ${experienceExamplesPromptPart ? 'experience examples.' : 'no experience examples.'}`);
        const completion = await openaiInstance.chat.completions.create({
            messages: messagesForApi, model: 'deepseek-chat', temperature: 0.05,
            max_tokens: 60 + (numMovesRequested * 6), stop: ["\n", "REASON:", "理由:", "解释:", " "],
        });
        let aiResponseText = completion.choices[0]?.message?.content?.trim() || "ERROR:NO_RESPONSE";
        aiResponseText = aiResponseText.replace(/^MOVE:\s*/i, '').trim().split('\n')[0].trim();
        console.log(`[2048 AI Assistant] Raw AI Response (after trim): "${aiResponseText}"`);
        event.node.res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        return aiResponseText;

    } catch (error) {
        console.error(`[2048 AI Assistant] Error:`, error.message);
        throw createError({
            statusCode: error.statusCode || 500,
            statusMessage: error.statusMessage || 'AI Service Error',
            message: error.message || '与2048 AI助手通信时发生错误。'
        });
    }
});
