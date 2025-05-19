import {defineEventHandler, readBody} from 'h3';
import prisma from '~/server/utils/prisma'; // 确保这个路径能正确解析到 Prisma Client 实例

export default defineEventHandler(async (event) => {
    const userId = event.context.auth?.userId;
    if (!userId) {
        event.node.res.statusCode = 401; // Unauthorized
        return {success: false, error: '用户未授权'};
    }

    try {
        // 2. 读取请求体
        const body = await readBody(event);
        // 使用对象解构和默认值，这在现代 JavaScript 中是支持的
        const {content, important = false} = body;

        // 3. 输入验证 (运行时检查在 JavaScript 中同样重要)
        if (!content || typeof content !== 'string' || content.trim().length === 0) {
            event.node.res.statusCode = 400; // Bad Request
            return {success: false, error: '待办事项内容不能为空'};
        }
        // 4. 更新数据库 (Prisma Client 的使用在 JavaScript 中是相同的)
        const newTodo = await prisma.todo.create({
            data: {
                content: content.trim(),
                important, // important 会是布尔值 (来自请求体或默认值)
                userId: userId,
            },
        });
        return {success: true, todo: newTodo};
    } catch (error) {
        console.error('[API] 创建待办事项失败:', error);
        event.node.res.statusCode = 500;
        return {success: false, error: '创建待办事项失败'};
    }
});