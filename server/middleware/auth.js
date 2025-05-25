import {defineEventHandler, createError, parseCookies} from 'h3';
import jwt from 'jsonwebtoken';
import prisma from '~/server/utils/prisma.js';

const JWT_SECRET = process.env.JWT_SECRET;

const PROTECTED_API_ROOT_PREFIX = '/api'; // 所有 /api/ 下的路径都先经过这里

// 定义在 PROTECTED_API_ROOT_PREFIX 下，但应被视为公共访问的路径前缀
// 例如，所有 /api/auth/ 开头的路径（如 /api/auth/login, /api/auth/register, /api/auth/logout）都将是公共的
const PUBLIC_API_SUB_PREFIXES = [
    '/api/auth/', // 注意末尾的斜杠，确保它匹配此目录下的所有内容
];

export default defineEventHandler(async (event) => {
    const path = event.path || event.node.req.url || '';

    // 检查路径是否以受保护的API根前缀开头
    if (path.startsWith(PROTECTED_API_ROOT_PREFIX)) {
        // 检查该路径是否以任何一个“公共API子前缀”开头
        const isPublicSubPath = PUBLIC_API_SUB_PREFIXES.some(publicPrefix => path.startsWith(publicPrefix));
        if (isPublicSubPath) {
            // 如果路径匹配一个公共API子前缀 (例如 /api/auth/login)，则不进行认证检查，直接允许访问
            return;
        }
        if (!JWT_SECRET) {
            console.error('Auth Middleware FATAL ERROR: JWT_SECRET is not defined.');
            throw createError({statusCode: 500, statusMessage: 'Server Configuration Error'});
        }

        const cookies = parseCookies(event);
        const token = cookies.auth_token;

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

            event.context.auth = {userId: userId};
            event.context.user = {
                id: userFromDb.id,
                username: userFromDb.username,
                email: userFromDb.email,
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
            } else if (error.statusCode) {
                statusCode = error.statusCode;
                clientMessage = error.message || clientMessage;
                statusMsg = error.statusMessage || statusMsg;
            }
            console.error(`Auth Middleware Error for ${path}:`, clientMessage, error);
            throw createError({statusCode, statusMessage: statusMsg, message: clientMessage});
        }
    }
});