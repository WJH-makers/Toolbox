import {createError, defineEventHandler} from 'h3';
import prisma from '~/server/utils/prisma';

export default defineEventHandler(async (event) => {
    if (!event.context.auth || !event.context.auth.userId) {
        throw createError({statusCode: 401, statusMessage: 'Unauthorized', message: '用户未认证'});
    }
    const userId = event.context.auth.userId;
    const sessionId = event.context.params?.sessionId;

    if (!sessionId) {
        throw createError({statusCode: 400, statusMessage: 'Bad Request', message: '未提供会话ID'});
    }

    try {
        const session = await prisma.aiChatSession.findUnique({
            where: {id: sessionId},
        });

        if (!session) {
            throw createError({statusCode: 404, statusMessage: 'Not Found', message: '会话未找到'});
        }

        if (session.userId !== userId) {
            throw createError({statusCode: 403, statusMessage: 'Forbidden', message: '无权删除此会话'});
        }

        await prisma.aiChatSession.delete({
            where: {
                id: sessionId,
            },
        });

        return {success: true, message: '会话已成功删除'};
    } catch (error) {
        if (error.statusCode) throw error;
        throw createError({statusCode: 500, statusMessage: 'Internal Server Error', message: '删除会话失败'});
    }
});