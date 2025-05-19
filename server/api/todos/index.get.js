// 文件: server/api/todos/index.get.js
import {defineEventHandler} from 'h3';
import prisma from '~/server/utils/prisma'; // 确保这个路径能正确解析到 Prisma Client 实例

export default defineEventHandler(async (event) => {
    // 1. 身份验证
    const userId = event.context.auth?.userId;
    if (!userId) {
        event.node.res.statusCode = 401; // Unauthorized
        return {success: false, error: '用户未授权'};
    }

    try {
        // 2. 从数据库获取当前用户的所有待办事项
        const todos = await prisma.todo.findMany({
            where: {
                userId: userId, // 使用认证用户的 ID 进行筛选
            },
            orderBy: [ // 可以按重要性降序，然后按创建时间降序排序
                {important: 'desc'},
                {createdAt: 'desc'},
            ],
        });
        // 3. 返回待办事项列表
        return {success: true, todos: todos};
    } catch (error) {
        console.error('[API] 获取待办事项列表失败:', error);
        event.node.res.statusCode = 500; // Internal Server Error
        return {success: false, error: '获取待办事项列表失败'};
    }
});