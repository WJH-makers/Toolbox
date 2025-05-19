// server/api/todos/index.post.js
import {defineEventHandler, readBody} from 'h3';
import prisma from '~/server/utils/prisma';

export default defineEventHandler(async (event) => {
    const userId = event.context.auth?.userId;
    if (!userId) {
        event.node.res.statusCode = 401;
        return {success: false, error: '用户未授权'};
    }

    try {
        const body = await readBody(event);
        const {content, important = false, startDate, endDate} = body;

        if (!content || typeof content !== 'string' || content.trim().length === 0) {
            event.node.res.statusCode = 400;
            return {success: false, error: '待办事项内容不能为空'};
        }

        const dataToCreate = {
            content: content.trim(),
            important,
            userId: userId,
        };

        if (startDate) {
            const sDate = new Date(startDate);
            if (isNaN(sDate.getTime())) {
                event.node.res.statusCode = 400;
                return {success: false, error: '无效的开始日期格式'};
            }
            dataToCreate.startDate = sDate;
        }

        if (endDate) {
            const eDate = new Date(endDate);
            if (isNaN(eDate.getTime())) {
                event.node.res.statusCode = 400;
                return {success: false, error: '无效的结束日期格式'};
            }
            dataToCreate.endDate = eDate;
        }

        if (dataToCreate.startDate && dataToCreate.endDate && dataToCreate.startDate >= dataToCreate.endDate) {
            event.node.res.statusCode = 400;
            return {success: false, error: '结束日期必须在开始日期之后'};
        }


        const newTodo = await prisma.todo.create({
            data: dataToCreate,
        });

        return {success: true, todo: newTodo};
    } catch (error) {
        console.error('[API] 创建待办事项失败:', error);
        event.node.res.statusCode = 500;
        return {success: false, error: '创建待办事项失败'};
    }
});