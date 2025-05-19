// server/api/todos/[id].delete.js
import {defineEventHandler} from 'h3';
import prisma from '~/server/utils/prisma';

export default defineEventHandler(async (event) => {
    const userId = event.context.auth?.userId;
    const todoId = event.context.params?.id; // 从动态路由参数获取 todoId

    if (!userId) {
        event.node.res.statusCode = 401;
        return {success: false, error: '用户未授权'};
    }

    if (!todoId) {
        event.node.res.statusCode = 400;
        return {success: false, error: '未提供待办事项ID'};
    }

    try {
        // 确保用户只能删除自己的待办事项
        const todoToDelete = await prisma.todo.findUnique({
            where: {id: todoId},
        });

        if (!todoToDelete) {
            event.node.res.statusCode = 404;
            return {success: false, error: '待办事项不存在'};
        }

        if (todoToDelete.userId !== userId) {
            event.node.res.statusCode = 403; // Forbidden
            return {success: false, error: '无权删除此待办事项'};
        }

        await prisma.todo.delete({
            where: {id: todoId},
        });

        return {success: true, message: '待办事项已删除'};
    } catch (error) {
        console.error(`[API] 删除待办事项 ${todoId} 失败:`, error);
        event.node.res.statusCode = 500;
        return {success: false, error: '删除待办事项失败'};
    }
});