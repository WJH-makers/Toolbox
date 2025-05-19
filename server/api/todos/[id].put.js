// server/api/todos/[id].put.js
import {defineEventHandler, readBody} from 'h3';
import prisma from '~/server/utils/prisma';

export default defineEventHandler(async (event) => {
    const userId = event.context.auth?.userId;
    const todoId = event.context.params?.id;

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
        const {content, completed, important, startDate, endDate} = body;

        const updateData = {};
        if (typeof content === 'string') {
            updateData.content = content.trim();
            if (updateData.content === '') {
                event.node.res.statusCode = 400;
                return {success: false, error: '待办事项内容不能为空'};
            }
        }
        if (typeof completed === 'boolean') {
            updateData.completed = completed;
        }
        if (typeof important === 'boolean') {
            updateData.important = important;
        }

        // 处理 startDate
        if (typeof startDate !== 'undefined') { // 允许将 startDate 设为 null 或具体日期
            if (startDate === null) {
                updateData.startDate = null;
            } else {
                const sDate = new Date(startDate);
                if (isNaN(sDate.getTime())) {
                    event.node.res.statusCode = 400;
                    return {success: false, error: '无效的开始日期格式'};
                }
                updateData.startDate = sDate;
            }
        }

        // 处理 endDate
        if (typeof endDate !== 'undefined') { // 允许将 endDate 设为 null 或具体日期
            if (endDate === null) {
                updateData.endDate = null;
            } else {
                const eDate = new Date(endDate);
                if (isNaN(eDate.getTime())) {
                    event.node.res.statusCode = 400;
                    return {success: false, error: '无效的结束日期格式'};
                }
                updateData.endDate = eDate;
            }
        }

        const finalStartDate = updateData.hasOwnProperty('startDate') ? updateData.startDate : (await prisma.todo.findUnique({where: {id: todoId}}))?.startDate;
        const finalEndDate = updateData.hasOwnProperty('endDate') ? updateData.endDate : (await prisma.todo.findUnique({where: {id: todoId}}))?.endDate;

        if (finalStartDate && finalEndDate && new Date(finalStartDate) >= new Date(finalEndDate)) {
            event.node.res.statusCode = 400;
            return {success: false, error: '结束日期必须在开始日期之后'};
        }


        if (Object.keys(updateData).length === 0) {
            event.node.res.statusCode = 400;
            return {success: false, error: '未提供任何更新内容'};
        }

        const todoToUpdate = await prisma.todo.findUnique({where: {id: todoId}});
        if (!todoToUpdate) {
            event.node.res.statusCode = 404;
            return {success: false, error: '待办事项不存在'};
        }
        if (todoToUpdate.userId !== userId) {
            event.node.res.statusCode = 403;
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