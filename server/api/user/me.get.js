import {defineEventHandler} from 'h3';
import prisma from '~/server/utils/prisma'; // 确保路径正确
export default defineEventHandler(async (event) => {
    const authenticatedUserContext = event.context.user;
    const userId = event.context.auth?.userId;
    if (!userId && !authenticatedUserContext) {
        event.node.res.statusCode = 401;
        return {success: false, error: '用户未授权或会话无效'};
    }
    try {
        const currentUserId = authenticatedUserContext?.id || userId;
        if (!currentUserId) {
            event.node.res.statusCode = 401;
            return {success: false, error: '无法确定用户身份'};
        }
        const user = await prisma.user.findUnique({
            where: {
                id: currentUserId,
            },
            select: {
                id: true,
                username: true,
                email: true,
                createdAt: true,
                updatedAt: true,
            },
        });
        if (!user) {
            event.node.res.statusCode = 404;
            return {success: false, error: '用户不存在'};
        }
        return {success: true, data: {user: user}};
    } catch (error) {
        console.error('获取用户信息失败 (/api/user/me):', error);
        event.node.res.statusCode = 500;
        return {success: false, error: '获取用户信息时发生服务器内部错误'};
    }
});