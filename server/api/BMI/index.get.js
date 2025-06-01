import {defineEventHandler, createError} from 'h3';
import prisma from '~/server/utils/prisma.js';

export default defineEventHandler(async (event) => {
    if (!event.context.auth) {
        throw createError({
            statusCode: 401,
            statusMessage: 'Unauthorized',
            message: '用户未认证，无法获取健康记录。',
        });
    }

    const userId = event.context.auth.userId;

    try {
        const healthMetrics = await prisma.userHealthMetric.findMany({
            where: {
                userId: userId,
            },
            orderBy: {
                recordedAt: 'desc', // 按记录时间倒序排列，最新的在前
            },
        });
        return {success: true, data: healthMetrics};
    } catch (error) {
        throw createError({
            statusCode: 500,
            statusMessage: 'Internal Server Error',
            message: '获取健康记录时发生错误，请稍后再试。',
        });
    }
});