// 文件路径: ~/server/api/auth/login.post.js
import prisma from '~/server/utils/prisma';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken'; // 1. 导入 jsonwebtoken
import {defineEventHandler, readBody, setCookie} from 'h3';

export default defineEventHandler(async (event) => {
    try {
        const body = await readBody(event);
        const {loginIdentifier, password} = body;

        if (!loginIdentifier || !password) {
            setResponseStatus(event, 400);
            return {success: false, message: '用户名/邮箱和密码均为必填项'};
        }

        const user = await prisma.user.findFirst({
            where: {
                OR: [
                    {email: loginIdentifier},
                    {username: loginIdentifier},
                ],
            },
        });

        if (!user) {
            setResponseStatus(event, 401);
            return {success: false, message: '用户不存在或密码错误'};
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);

        if (!isPasswordValid) {
            setResponseStatus(event, 401);
            return {success: false, message: '用户不存在或密码错误'};
        }

        const userResponse = {...user};
        delete userResponse.password;

        // 2. 生成身份验证令牌 (JWT)
        const token = jwt.sign(
            {userId: user.id, username: user.username, email: user.email}, // 你想包含在 token 中的用户信息
            process.env.JWT_SECRET, // 从环境变量中获取密钥
            {expiresIn: '1h'}    // Token 有效期，例如1小时 (可以是 '7d', '30m' 等)
        );

        // 3. 将 Token 设置为 HTTP Only Cookie
        setCookie(event, 'auth_token', token, { // 'auth_token' 是你给 cookie 起的名字
            httpOnly: true, // true: Cookie 不能通过客户端 JavaScript 访问，有助于防止 XSS 攻击
            secure: process.env.NODE_ENV === 'production', // true: Cookie 只在 HTTPS 连接下发送
            sameSite: 'lax', // 'lax' 或 'strict' 有助于防止 CSRF 攻击。'lax' 允许在顶级导航时发送 cookie。
            maxAge: 60 * 60 * 1,
            path: '/',
        });

        setResponseStatus(event, 200);
        return {
            success: true,
            message: '登录成功',
            user: userResponse,
        };

    } catch (error) {
        console.error('登录时发生错误:', error);
        if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
            setResponseStatus(event, 500);
            return {success: false, message: '无法生成身份验证令牌，请稍后再试'};
        }
        setResponseStatus(event, 500);
        return {success: false, message: '服务器内部错误，登录失败'};
    }
});