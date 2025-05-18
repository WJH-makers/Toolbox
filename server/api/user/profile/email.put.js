import {defineEventHandler, readBody} from 'h3';
import prisma from '~/server/utils/prisma';

export default defineEventHandler(async (event) => {
    const userId = event.context.auth?.userId;
    if (!userId) {
        event.node.res.statusCode = 401;
        return {success: false, error: '用户未授权'};
    }

    const body = await readBody(event);
    const newEmail = body.email;

    if (!newEmail || typeof newEmail !== 'string' || !/^\S+@\S+\.\S+$/.test(newEmail)) {
        event.node.res.statusCode = 400;
        return {success: false, error: '邮箱格式不正确'};
    }

    try {
        const existingUserWithEmail = await prisma.user.findUnique({
            where: {email: newEmail},
        });
        if (existingUserWithEmail && existingUserWithEmail.id !== userId) {
            event.node.res.statusCode = 409;
            return {success: false, error: '此邮箱已被注册'};
        }

        const updatedUser = await prisma.user.update({
            where: {id: userId},
            data: {email: newEmail.trim()},
            select: {id: true, username: true, email: true}
        });

        return {success: true, message: '邮箱更新成功！(实际应用中可能需要验证)', data: updatedUser};

    } catch (error) {
        console.error('更新邮箱失败:', error);
        if (error.code === 'P2002' && error.meta?.target?.includes('email')) {
            event.node.res.statusCode = 409;
            return {success: false, error: '此邮箱已被注册 (P2002)'};
        }
        event.node.res.statusCode = 500;
        return {success: false, error: '更新邮箱时发生服务器内部错误'};
    }
});