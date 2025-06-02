import prismaInstance from '~/server/utils/prisma';
// 直接从 @prisma/client 导入 Prisma 命名空间，它包含了错误类型
import {Prisma} from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import {defineEventHandler, readBody, setCookie, setResponseStatus, getRequestIP} from 'h3';

// Configuration Constants
const MIN_LOGIN_IDENTIFIER_LENGTH = 3;
const MAX_LOGIN_IDENTIFIER_LENGTH = 254;
const MIN_PASSWORD_LENGTH = 6;
const MAX_PASSWORD_LENGTH = 128;

const JWT_EXPIRATION = '1h';
const COOKIE_MAX_AGE_SECONDS = 1 * 60 * 60; // 1 hour

const MAX_FAILED_LOGIN_ATTEMPTS = 5;
const ACCOUNT_LOCKOUT_DURATION_MINUTES = 15;

const IP_BASED_RATE_LIMIT_MAX_ATTEMPTS = 10;
const IP_BASED_RATE_LIMIT_WINDOW_MS = 5 * 60 * 1000; // 5 minutes

const ipAttemptStore = new Map(); // 注意：仅限单实例内存存储

export default defineEventHandler(async (event) => {
    const handlerName = '[Server API - Login]'; // 简化日志前缀
    const requestIp = getRequestIP(event, {xForwardedFor: true}) || 'unknown_ip';
    const now = Date.now();

    // 1. IP 速率限制检查
    const ipAttempts = ipAttemptStore.get(requestIp) || [];
    const recentAttempts = ipAttempts.filter(timestamp => (now - timestamp) < IP_BASED_RATE_LIMIT_WINDOW_MS);

    if (recentAttempts.length >= IP_BASED_RATE_LIMIT_MAX_ATTEMPTS) {
        console.warn(`${handlerName} Rate limit exceeded for IP: ${requestIp}. Attempts: ${recentAttempts.length}`);
        setResponseStatus(event, 429); // Too Many Requests
        // 即使被拒绝也更新尝试时间，以延长等待
        recentAttempts.push(now);
        ipAttemptStore.set(requestIp, recentAttempts);
        return {
            success: false,
            message: '您尝试的次数过多，请稍后再试。',
            error: 'Too Many Requests.'
        };
    }

    // 2. 检查 JWT_SECRET 是否配置
    if (!process.env.JWT_SECRET) {
        console.error(`${handlerName} CRITICAL: JWT_SECRET is not defined. Login functionality disabled. IP: ${requestIp}`);
        setResponseStatus(event, 500);
        return {success: false, message: '服务器配置错误，无法完成登录。', error: 'Internal Server Configuration Error.'};
    }

    try {
        const body = await readBody(event);
        const {loginIdentifier, password} = body;

        // 在处理实际逻辑前，记录这次有效的请求尝试 (如果上面没有提前返回)
        const currentIpAttempts = ipAttemptStore.get(requestIp) || [];
        const updatedIpAttempts = currentIpAttempts.filter(timestamp => (now - timestamp) < IP_BASED_RATE_LIMIT_WINDOW_MS);
        updatedIpAttempts.push(now);
        ipAttemptStore.set(requestIp, updatedIpAttempts);

        // 3. 更严格的输入验证
        if (!loginIdentifier || typeof loginIdentifier !== 'string' || loginIdentifier.trim().length === 0) {
            setResponseStatus(event, 400);
            return {success: false, message: '用户名或邮箱不能为空。'};
        }
        if (!password || typeof password !== 'string' || password.length === 0) {
            setResponseStatus(event, 400);
            return {success: false, message: '密码不能为空。'};
        }
        if (loginIdentifier.length < MIN_LOGIN_IDENTIFIER_LENGTH || loginIdentifier.length > MAX_LOGIN_IDENTIFIER_LENGTH) {
            setResponseStatus(event, 400);
            return {
                success: false,
                message: `用户名/邮箱长度必须在 ${MIN_LOGIN_IDENTIFIER_LENGTH} 到 ${MAX_LOGIN_IDENTIFIER_LENGTH} 字符之间。`
            };
        }
        if (password.length < MIN_PASSWORD_LENGTH || password.length > MAX_PASSWORD_LENGTH) {
            setResponseStatus(event, 400);
            return {
                success: false,
                message: `密码长度必须在 ${MIN_PASSWORD_LENGTH} 到 ${MAX_PASSWORD_LENGTH} 字符之间。`
            };
        }

        const normalizedLoginIdentifier = loginIdentifier.toLowerCase();

        // 4. Prisma 查询用户
        const user = await prismaInstance.user.findFirst({
            where: {
                OR: [
                    {email: normalizedLoginIdentifier},
                    {username: loginIdentifier}, // 用户名是否区分大小写取决于数据库和你的 Prisma schema 设置
                ],
            },
        });

        if (!user) {
            console.warn(`${handlerName} Login attempt failed for identifier: "${loginIdentifier}" (user not found). IP: ${requestIp}`);
            setResponseStatus(event, 401);
            return {success: false, message: '凭证无效，请检查您的用户名/邮箱和密码。'};
        }

        // 5. 检查账户锁定状态
        if (user.isLocked && user.lockoutExpiresAt && new Date() < new Date(user.lockoutExpiresAt)) {
            const remainingLockoutTime = Math.ceil((new Date(user.lockoutExpiresAt).getTime() - new Date().getTime()) / (1000 * 60));
            console.warn(`${handlerName} Login attempt for locked account: ${user.username}. IP: ${requestIp}`);
            setResponseStatus(event, 403); // Forbidden
            return {success: false, message: `账户已被锁定，请在 ${remainingLockoutTime} 分钟后重试。`};
        }

        // 6. 验证密码
        const isPasswordValid = await bcrypt.compare(password, user.password);

        if (!isPasswordValid) {
            const newFailedAttempts = (user.failedLoginAttempts || 0) + 1; // 确保 failedLoginAttempts 有默认值
            let updateData = {
                failedLoginAttempts: newFailedAttempts,
                lastFailedLoginAt: new Date(),
            };

            if (newFailedAttempts >= MAX_FAILED_LOGIN_ATTEMPTS) {
                updateData.isLocked = true;
                updateData.lockoutExpiresAt = new Date(Date.now() + ACCOUNT_LOCKOUT_DURATION_MINUTES * 60 * 1000);
                console.warn(`${handlerName} Account locked for user: ${user.username} due to too many failed attempts. IP: ${requestIp}`);
            }

            await prismaInstance.user.update({
                where: {id: user.id},
                data: updateData,
            });

            console.warn(`${handlerName} Login attempt failed for user: ${user.username} (invalid password). Attempt ${newFailedAttempts}/${MAX_FAILED_LOGIN_ATTEMPTS}. IP: ${requestIp}`);
            setResponseStatus(event, 401);
            return {success: false, message: '凭证无效，请检查您的用户名/邮箱和密码。'};
        }

        // 7. 登录成功 - 更新用户状态
        // 确保 lastLoginAt 字段在你的 User 模型中存在
        const successUpdateData = {
            lastLoginAt: new Date(),
        };
        if (user.failedLoginAttempts > 0 || user.isLocked) {
            successUpdateData.failedLoginAttempts = 0;
            successUpdateData.isLocked = false;
            successUpdateData.lockoutExpiresAt = null;
        }
        await prismaInstance.user.update({
            where: {id: user.id},
            data: successUpdateData,
        });

        // 8. 准备用户响应数据（不含敏感信息）
        const userResponse = {
            id: user.id,
            username: user.username,
            email: user.email,
            // 可以添加其他希望返回给客户端的非敏感信息
        };

        // 9. 生成 JWT
        const tokenPayload = {userId: user.id}; // 保持 payload 简洁
        const token = jwt.sign(tokenPayload, process.env.JWT_SECRET, {expiresIn: JWT_EXPIRATION});

        // 10. 设置 HttpOnly Cookie
        setCookie(event, 'auth_token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: COOKIE_MAX_AGE_SECONDS,
            path: '/',
        });

        console.log(`${handlerName} User ${user.username} logged in successfully. IP: ${requestIp}`);
        setResponseStatus(event, 200);
        return {
            success: true,
            message: '登录成功。',
            data: {user: userResponse}
        };

    } catch (error) {
        console.error(`${handlerName} UNHANDLED EXCEPTION for IP ${requestIp}:`, error.name, error.message, error.stack ? error.stack : '(no stack trace)');

        let statusCode = 500;
        let clientMessage = '服务器内部错误，登录操作无法完成，请稍后重试。';

        if (error.name === 'JsonWebTokenError') {
            clientMessage = '身份验证会话创建失败，请联系管理员。';
        } else if (Prisma && Prisma.PrismaClientKnownRequestError && error instanceof Prisma.PrismaClientKnownRequestError) {
            // 使用 Prisma.PrismaClientKnownRequestError
            clientMessage = '数据库交互错误，请稍后再试。';
            console.error(`${handlerName} Prisma Known Request Error - Code: ${error.code}, Meta: ${JSON.stringify(error.meta)}`);
        } else if (Prisma && Prisma.PrismaClientValidationError && error instanceof Prisma.PrismaClientValidationError) {
            // 使用 Prisma.PrismaClientValidationError
            clientMessage = '请求数据验证失败，请检查输入。';
            statusCode = 400;
            console.error(`${handlerName} Prisma Validation Error: ${error.message}`);
        }

        setResponseStatus(event, statusCode);
        return {
            success: false,
            message: clientMessage,
            error: process.env.NODE_ENV === 'development' ? error.message : 'An unexpected error occurred.'
        };
    }
});