import {defineEventHandler, readBody} from 'h3';
import prisma from '~/server/utils/prisma'; // 导入 Prisma Client 实例

export default defineEventHandler(async (event) => {
    // 1. 身份验证
    const userId = event.context.auth?.userId;
    if (!userId) {
        event.node.res.statusCode = 401; // Unauthorized
        return {success: false, error: '用户未授权'};
    }
    // 2. 读取请求体
    const body = await readBody(event);
    const newUsername = body.username;
    // 3. 输入验证
    if (!newUsername || typeof newUsername !== 'string' || newUsername.trim().length < 3) {
        event.node.res.statusCode = 400; // Bad Request
        return {success: false, error: '用户名无效或长度不足 (至少3个字符)'};
    }
    try {
        // 4. 检查用户名是否已被占用
        const existingUserWithUsername = await prisma.user.findUnique({
            where: {username: newUsername},
        });
        if (existingUserWithUsername && existingUserWithUsername.id !== userId) {
            event.node.res.statusCode = 409; // Conflict
            return {success: false, error: '此用户名已被占用'};
        }
        // 5. 更新数据库
        const updatedUser = await prisma.user.update({
            where: {id: userId},
            data: {username: newUsername.trim()},
            select: {id: true, username: true, email: true}
        });
        return {success: true, message: '用户名更新成功！', data: updatedUser};
    } catch (error) {
        console.error('更新用户名失败:', error);
        if (error.code === 'P2002' && error.meta?.target?.includes('username')) {
            event.node.res.statusCode = 409;
            return {success: false, error: '此用户名已被占用 (P2002)'};
        }
        event.node.res.statusCode = 500;
        return {success: false, error: '更新用户名时发生服务器内部错误'};
    }
});