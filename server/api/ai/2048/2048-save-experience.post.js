// server/api/ai/2048-save-experience.post.js
import {createError, defineEventHandler, readBody} from 'h3';
import prisma from '~/server/utils/prisma'; // 确保 Prisma Client 路径正确

const MAX_GLOBAL_AI_EXPERIENCES = 25; // AI只保留最好的25条全局经验记录

export default defineEventHandler(async (event) => {
    const body = await readBody(event);
    const {
        gameId,
        initialBoardStateJson, // 新增
        finalBoardStateJson,   // 原 boardStateJson
        moveSequenceJson,
        scoreAchieved,
        highestTile,
        numberOfMoves,
        notes
    } = body;

    if (
        !initialBoardStateJson || typeof initialBoardStateJson !== 'string' || // 校验新增字段
        !finalBoardStateJson || typeof finalBoardStateJson !== 'string' ||
        !moveSequenceJson || typeof moveSequenceJson !== 'string' ||
        typeof scoreAchieved !== 'number' ||
        typeof highestTile !== 'number' ||
        typeof numberOfMoves !== 'number'
    ) {
        throw createError({
            statusCode: 400,
            statusMessage: 'Bad Request',
            message: '缺少必要的经验数据字段或类型不正确 (需要 initialBoardStateJson, finalBoardStateJson 等)。'
        });
    }

    try {
        JSON.parse(initialBoardStateJson); // 简单验证
        JSON.parse(finalBoardStateJson);
        JSON.parse(moveSequenceJson);

        const newExperience = await prisma.ai2048Experience.create({
            data: {
                gameId: gameId || `ai_game_${Date.now()}_${Math.random().toString(16).slice(2)}`,
                initialBoardStateJson, // 保存初始状态
                finalBoardStateJson,   // 保存最终状态
                moveSequenceJson,
                scoreAchieved,
                highestTile,
                numberOfMoves,
                notes: notes || null,
            }
        });

        // 检查是否需要修剪旧的/较差的经验 (逻辑与之前相同)
        const totalExperiences = await prisma.ai2048Experience.count();
        if (totalExperiences > MAX_GLOBAL_AI_EXPERIENCES) {
            const experiencesToPrune = await prisma.ai2048Experience.findMany({
                orderBy: [
                    {scoreAchieved: 'asc'},
                    {highestTile: 'asc'},
                    {createdAt: 'asc'}
                ],
                take: totalExperiences - MAX_GLOBAL_AI_EXPERIENCES
            });

            if (experiencesToPrune.length > 0) {
                const idsToDelete = experiencesToPrune.map(exp => exp.id);
                await prisma.ai2048Experience.deleteMany({
                    where: {id: {in: idsToDelete}}
                });
            }
        }

        return {code: 200, msg: 'AI全局经验已成功保存。', data: {experienceId: newExperience.id}};

    } catch (error) {
        if (error instanceof SyntaxError) {
            throw createError({
                statusCode: 400,
                statusMessage: 'Bad Request',
                message: '提供的棋盘状态或移动序列JSON格式无效。'
            });
        }
        throw createError({
            statusCode: 500,
            statusMessage: 'Internal Server Error',
            message: '保存AI全局经验时发生服务器内部错误。'
        });
    }
});
