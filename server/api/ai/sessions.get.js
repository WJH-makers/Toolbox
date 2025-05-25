import {defineEventHandler, createError} from 'h3';
import prisma from '~/server/utils/prisma';

export default defineEventHandler(async (event) => {
    if (!event.context.auth || !event.context.auth.userId) {
        throw createError({statusCode: 401, statusMessage: 'Unauthorized'});
    }
    const userId = event.context.auth.userId;

    try {
        const sessions = await prisma.aiChatSession.findMany({
            where: {userId},
            orderBy: {updatedAt: 'desc'},
            select: {
                id: true,
                title: true,
                updatedAt: true,
                createdAt: true,
            }
        });
        return {success: true, data: sessions};
    } catch (error) {
        console.error("获取AI会话列表失败:", error);
        throw createError({statusCode: 500, statusMessage: 'Internal Server Error'});
    }
});