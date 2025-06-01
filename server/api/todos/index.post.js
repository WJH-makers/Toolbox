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
        const {
            title,
            content,
            image,
            important = false,
            startDate,
            endDate
        } = body;
        console.log('[API /api/todos POST] Received body:', body); // 打印整个请求体

        if (!title || typeof title !== 'string' || title.trim().length === 0) {
            event.node.res.statusCode = 400;
            return {success: false, error: '待办事项标题不能为空'};
        }

        const dataToCreate = {
            title: title.trim(),
            userId: userId,
            important: important,
        };

        if (content && typeof content === 'string' && content.trim().length > 0) {
            dataToCreate.content = content.trim();
        } else {
            dataToCreate.content = null;
        }

        if (image && typeof image === 'string' && image.trim().length > 0) {
            dataToCreate.image = image;
        } else {
            dataToCreate.image = null;
        }

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

        if (dataToCreate.startDate && dataToCreate.endDate && dataToCreate.startDate.getTime() >= dataToCreate.endDate.getTime()) {
            event.node.res.statusCode = 400;
            return {success: false, error: '结束日期必须在开始日期之后'};
        }

        const newTodo = await prisma.todo.create({
            data: dataToCreate,
        });

        return {success: true, todo: newTodo};

    } catch (error) {
        console.error('[API] 创建待办事项失败:', error);
        if (error.code === 'P2002') {
            event.node.res.statusCode = 409;
            return {success: false, error: '创建待办事项失败，可能存在唯一性冲突。'};
        }
        event.node.res.statusCode = 500;
        return {success: false, error: '创建待办事项失败，服务器内部错误。'};
    }
});