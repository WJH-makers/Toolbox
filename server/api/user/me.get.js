import {defineEventHandler} from 'h3';
import prisma from '~/server/utils/prisma'; // 确保路径正确
export default defineEventHandler(async (event) => {
    const authenticatedUserContext = event.context.user; // 从 auth.js 中间件获取
    const userId = event.context.auth?.userId; // 或者只依赖 userId
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
            select: { // 只选择需要返回给前端的安全字段
                id: true,
                username: true,
                email: true,
                // avatarUrl: true, // 如果你的 Prisma schema 中有 avatarUrl 字段
                createdAt: true,
                updatedAt: true,
            },
        });
        if (!user) {
            event.node.res.statusCode = 404; // 或者 403 Forbidden，如果ID有效但用户被禁用
            return {success: false, error: '用户不存在'};
        }
        return {success: true, user: user};
    } catch (error) {
        console.error('获取用户信息失败 (/api/user/me):', error);
        event.node.res.statusCode = 500;
        return {success: false, error: '获取用户信息时发生服务器内部错误'};
    }
});