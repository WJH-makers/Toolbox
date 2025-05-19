// server/api/todos/[id].put.js
import {defineEventHandler, readBody} from 'h3';
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
        const body = await readBody(event);
        const {content, completed, important} = body;

        const updateData = {}; // 在JS中，对象可以动态添加属性
        if (typeof content === 'string') {
            updateData.content = content.trim();
        }
        if (typeof completed === 'boolean') {
            updateData.completed = completed;
        }
        if (typeof important === 'boolean') {
            updateData.important = important;
        }

        if (Object.keys(updateData).length === 0) {
            event.node.res.statusCode = 400;
            return {success: false, error: '未提供任何更新内容'};
        }
        // 如果 content 被提供了，但trim后为空字符串，也视为无效
        if (updateData.hasOwnProperty('content') && updateData.content === '') {
            event.node.res.statusCode = 400;
            return {success: false, error: '待办事项内容不能为空'};
        }

        // 确保用户只能更新自己的待办事项
        const todoToUpdate = await prisma.todo.findUnique({
            where: {id: todoId},
        });

        if (!todoToUpdate) {
            event.node.res.statusCode = 404;
            return {success: false, error: '待办事项不存在'};
        }

        if (todoToUpdate.userId !== userId) {
            event.node.res.statusCode = 403; // Forbidden
            return {success: false, error: '无权修改此待办事项'};
        }

        const updatedTodo = await prisma.todo.update({
            where: {id: todoId},
            data: updateData,
        });

        return {success: true, todo: updatedTodo};
    } catch (error) {
        console.error(`[API] 更新待办事项 ${todoId} 失败:`, error);
        event.node.res.statusCode = 500;
        return {success: false, error: '更新待办事项失败'};
    }
});