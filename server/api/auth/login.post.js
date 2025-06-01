import prisma from '~/server/utils/prisma';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import {defineEventHandler, readBody, setCookie, setResponseStatus} from 'h3'; // 确保导入 setResponseStatus

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
        // 创建不包含密码的用户信息对象
        const userResponse = {
            id: user.id,
            username: user.username,
            email: user.email,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
        };

        const token = jwt.sign(
            {userId: user.id, username: user.username, email: user.email},
            process.env.JWT_SECRET,
            {expiresIn: '1h'}
        );

        setCookie(event, 'auth_token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 60 * 60 * 3, // 3 小时
            path: '/',
        });

        setResponseStatus(event, 200);
        return {
            success: true,
            message: '登录成功',
            data: {user: userResponse} // *** 修改处：将 user 对象包裹在 data 字段中 ***
        };

    } catch (error) {
        let errorMessage = '服务器内部错误，登录失败';
        if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
            errorMessage = '无法生成身份验证令牌，请稍后再试';
        }
        setResponseStatus(event, 500);
        return {success: false, message: errorMessage, error: errorMessage};
    }
});