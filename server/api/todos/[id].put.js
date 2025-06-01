// server/api/todos/[id].put.js
import {defineEventHandler, readBody} from 'h3';
import prisma from '~/server/utils/prisma'; // 确保此路径在您的 Nuxt 项目中正确

export default defineEventHandler(async (event) => {
    const userId = event.context.auth?.userId; // 假设 userId 从认证上下文中获取
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
        // 1. 先查找待办事项并验证权限
        const todoToUpdate = await prisma.todo.findUnique({
            where: {id: todoId},
        });

        if (!todoToUpdate) {
            event.node.res.statusCode = 404;
            return {success: false, error: '待办事项不存在'};
        }

        if (todoToUpdate.userId !== userId) {
            event.node.res.statusCode = 403;
            return {success: false, error: '无权修改此待办事项'};
        }

        // 2. 读取请求体
        const body = await readBody(event);
        const {
            title,
            content,
            image,
            completed,
            important,
            startDate,
            endDate
        } = body;

        // 3. 构建要更新的数据对象 (纯 JavaScript 对象)
        const updateData = {};

        // 处理 title 更新
        if (Object.prototype.hasOwnProperty.call(body, 'title')) {
            if (typeof title === 'string' && title.trim().length > 0) {
                updateData.title = title.trim();
            } else {
                event.node.res.statusCode = 400;
                return {success: false, error: '待办事项标题不能为空'};
            }
        }

        // 处理 content 更新 (允许设为 null 或空字符串转为 null)
        if (Object.prototype.hasOwnProperty.call(body, 'content')) {
            if (content === null || (typeof content === 'string' && content.trim() === '')) {
                updateData.content = null;
            } else if (typeof content === 'string') {
                updateData.content = content.trim();
            } else {
                event.node.res.statusCode = 400;
                return {success: false, error: '待办事项内容格式无效'};
            }
        }

        // 处理 image 更新 (允许设为 null 或空字符串转为 null)
        if (Object.prototype.hasOwnProperty.call(body, 'image')) {
            if (image === null || (typeof image === 'string' && image.trim() === '')) {
                updateData.image = null;
            } else if (typeof image === 'string') {
                updateData.image = image; // 图片数据(如Base64)不应随意 trim
            } else {
                event.node.res.statusCode = 400;
                return {success: false, error: '图片数据格式无效'};
            }
        }

        if (Object.prototype.hasOwnProperty.call(body, 'completed')) {
            if (typeof completed === 'boolean') {
                updateData.completed = completed;
            } else {
                event.node.res.statusCode = 400;
                return {success: false, error: '完成状态格式无效'};
            }
        }

        if (Object.prototype.hasOwnProperty.call(body, 'important')) {
            if (typeof important === 'boolean') {
                updateData.important = important;
            } else {
                event.node.res.statusCode = 400;
                return {success: false, error: '重要性状态格式无效'};
            }
        }

        // 处理 startDate 更新
        if (Object.prototype.hasOwnProperty.call(body, 'startDate')) {
            if (startDate === null) {
                updateData.startDate = null;
            } else if (typeof startDate === 'string' || startDate instanceof Date) {
                const sDate = new Date(startDate);
                if (isNaN(sDate.getTime())) {
                    event.node.res.statusCode = 400;
                    return {success: false, error: '无效的开始日期格式'};
                }
                updateData.startDate = sDate;
            } else {
                event.node.res.statusCode = 400;
                return {success: false, error: '开始日期格式无效'};
            }
        }

        // 处理 endDate 更新
        if (Object.prototype.hasOwnProperty.call(body, 'endDate')) {
            if (endDate === null) {
                updateData.endDate = null;
            } else if (typeof endDate === 'string' || endDate instanceof Date) {
                const eDate = new Date(endDate);
                if (isNaN(eDate.getTime())) {
                    event.node.res.statusCode = 400;
                    return {success: false, error: '无效的结束日期格式'};
                }
                updateData.endDate = eDate;
            } else {
                event.node.res.statusCode = 400;
                return {success: false, error: '结束日期格式无效'};
            }
        }

        // 4. 日期范围验证
        const sDateToValidate = Object.prototype.hasOwnProperty.call(updateData, 'startDate') ? updateData.startDate : todoToUpdate.startDate;
        const eDateToValidate = Object.prototype.hasOwnProperty.call(updateData, 'endDate') ? updateData.endDate : todoToUpdate.endDate;

        if (sDateToValidate && eDateToValidate && new Date(sDateToValidate).getTime() >= new Date(eDateToValidate).getTime()) {
            event.node.res.statusCode = 400;
            return {success: false, error: '结束日期必须在开始日期之后'};
        }

        // 5. 检查是否有任何实际的更新内容
        if (Object.keys(updateData).length === 0) {
            event.node.res.statusCode = 400;
            return {success: false, error: '未提供任何更新内容'};
        }

        // 6. 执行更新
        const updatedTodo = await prisma.todo.update({
            where: {id: todoId},
            data: updateData, // Prisma Client 会处理这个动态构建的对象
        });

        return {success: true, todo: updatedTodo};

    } catch (error) { // 移除了 ': any' 类型注解
        console.error(`[API] 更新待办事项 ${todoId} 失败:`, error);
        // 检查 error 是否有 code 属性 (更安全的做法)
        if (error && error.code === 'P2002') {
            event.node.res.statusCode = 409;
            return {success: false, error: '更新待办事项失败，可能存在唯一性冲突。'};
        }
        if (error && error.code === 'P2025') {
            event.node.res.statusCode = 404;
            return {success: false, error: '尝试更新的待办事项不存在。'};
        }
        event.node.res.statusCode = 500;
        return {success: false, error: '更新待办事项失败，服务器内部错误。'};
    }
});