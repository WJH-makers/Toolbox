import {createError, defineEventHandler, parseCookies} from 'h3';
import jwt from 'jsonwebtoken';
import prisma from '~/server/utils/prisma.js';

const JWT_SECRET = process.env.JWT_SECRET;
const PROTECTED_API_ROOT_PREFIX = '/api';
const PUBLIC_API_SUB_PREFIXES = [
    '/api/auth/',
    '/api/_nuxt_icon/',
];

export default defineEventHandler(async (event) => {
    const rawPath = event.path || event.node.req.url || '';
    // 匹配路径时，通常最好移除查询参数，只比较基础路径
    const path = rawPath.split('?')[0];
    if (path.startsWith(PROTECTED_API_ROOT_PREFIX)) {
        const isPublicSubPath = PUBLIC_API_SUB_PREFIXES.some(publicPrefix => path.startsWith(publicPrefix));
        if (isPublicSubPath) {
            return; // 公开路径，跳过认证
        }
        if (!JWT_SECRET) {
            console.error('Auth Middleware FATAL ERROR: JWT_SECRET is not defined.');
            throw createError({statusCode: 500, statusMessage: 'Server Configuration Error'});
        }
        const cookies = parseCookies(event);
        const token = cookies.auth_token;
        if (!token) {
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
            console.error(`Auth Middleware Error for ${rawPath}:`, clientMessage, error.name);
            throw createError({statusCode, statusMessage: statusMsg, message: clientMessage});
        }
    }
});