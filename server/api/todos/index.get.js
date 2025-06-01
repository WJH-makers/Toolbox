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
            orderBy: [ // 按重要性降序，然后按创建时间降序排序 (与之前一致)
                {important: 'desc'},
                {createdAt: 'desc'},
            ],
            // 3. 使用 select 精确选择需要的字段
            select: {
                id: true,
                title: true,         // 新增的标题字段
                content: true,       // 详细内容，用于模态框
                completed: true,
                important: true,
                startDate: true,     // 开始日期，用于模态框和可能的逻辑判断
                endDate: true,       // 结束日期，用于模态框和“已过期”标签
                image: true,         // 图片信息，用于模态框
                createdAt: true,     // 创建时间，用于排序或显示
                updatedAt: true,     // 更新时间，用于排序或显示
                // 注意：userId 和关联的 user 对象没有被选择，因为前端可能不需要它们
            }
        });

        // 4. 返回待办事项列表
        return {success: true, todos: todos};

    } catch (error) {
        console.error('[API] 获取待办事项列表失败:', error);
        event.node.res.statusCode = 500; // Internal Server Error
        return {success: false, error: '获取待办事项列表失败'};
    }
});