// server/middleware/auth.js
import {defineEventHandler, createError, parseCookies} from 'h3'; // 引入 parseCookies
import jwt from 'jsonwebtoken';
import prisma from '~/server/utils/prisma.js';

const JWT_SECRET = process.env.JWT_SECRET;

export default defineEventHandler(async (event) => {
    const protectedPaths = [
        '/api/user/profile/username',
        '/api/user/profile/email',
        '/api/user/profile/password',
        '/api/user/me',
        '/api/todos',
    ];

    const path = event.path || event.node.req.url || '';
    const isProtectedRoute = protectedPaths.some(p => path.startsWith(p));

    if (isProtectedRoute) {
        if (!JWT_SECRET) {
            console.error('Auth Middleware FATAL ERROR: JWT_SECRET is not defined.');
            throw createError({statusCode: 500, statusMessage: 'Server Configuration Error'});
        }

        // 1. 从 Cookie 中解析名为 'auth_token' 的 token
        const cookies = parseCookies(event);
        const token = cookies.auth_token; // 'auth_token' 是你在 login.post.js 中设置的 cookie 名称

        if (!token) {
            console.log(`Auth Middleware: No 'auth_token' cookie found for protected route ${path}`);
            throw createError({
                statusCode: 401,
                statusMessage: 'Unauthorized',
                message: '未提供认证凭据。',
            });
        }

        try {
            const decodedPayload = jwt.verify(token, JWT_SECRET);
            const userId = decodedPayload.userId || decodedPayload.sub || decodedPayload.id;

            if (!userId || typeof userId !== 'string') {
                throw createError({statusCode: 403, statusMessage: 'Forbidden', message: '令牌无效或用户信息不完整。'});
            }

            const userFromDb = await prisma.user.findUnique({where: {id: userId}});
            if (!userFromDb) {
                throw createError({statusCode: 403, statusMessage: 'Forbidden', message: '用户不存在或已被禁用。'});
            }

            // 将必要的用户信息附加到事件上下文
            event.context.auth = {userId: userId};
            // 避免将整个数据库对象（包含密码哈希）放入上下文，除非已筛选
            event.context.user = {
                id: userFromDb.id,
                username: userFromDb.username,
                email: userFromDb.email
                // 根据需要添加其他安全字段
            };

            console.log(`Auth Middleware: User ${userId} authorized for route ${path}`);

        } catch (error) {
            let statusCode = 401;
            let clientMessage = '认证失败或令牌无效。';
            let statusMsg = 'Unauthorized';

            if (error.name === 'TokenExpiredError') {
                clientMessage = '认证令牌已过期，请重新登录。';
                statusMsg = 'Token Expired';
            } else if (error.name === 'JsonWebTokenError') {
                clientMessage = '认证令牌格式无效。';
                statusMsg = 'Invalid Token';
            } else if (error.statusCode) { // 如果是 H3Error
                statusCode = error.statusCode;
                clientMessage = error.message || clientMessage;
                statusMsg = error.statusMessage || statusMsg;
            }

            console.error(`Auth Middleware Error for ${path}:`, clientMessage, error);
            throw createError({statusCode, statusMessage: statusMsg, message: clientMessage});
        }
    }
});
