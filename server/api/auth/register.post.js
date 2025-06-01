// server/api/auth/register.post.js
import prisma from '~/server/utils/prisma';
import bcrypt from 'bcryptjs';

export default defineEventHandler(async (event) => {
    try {
        const body = await readBody(event); // Nuxt 3 读取请求体的工具函数
        const {username, email, password} = body;
        if (!username || !email || !password) {
            setResponseStatus(event, 400);
            return {success: false, message: '用户名、邮箱和密码均为必填项'};
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            setResponseStatus(event, 400);
            return {success: false, message: '请输入有效的邮箱地址'};
        }
        if (password.length < 8) {
            setResponseStatus(event, 400);
            return {success: false, message: '密码长度至少需要8位'};
        }
        const hasUpperCase = /[A-Z]/.test(password);
        const hasLowerCase = /[a-z]/.test(password);
        const hasNumber = /[0-9]/.test(password);
        const hasSpecialChar = /[!@#$%^&*()_+\-=\\[\]{};':"\\|,.<>\\/?]+/.test(password);

        if (!hasUpperCase || !hasLowerCase || !hasNumber) {
            setResponseStatus(event, 400);
            let missingCharsMessage = '密码必须包含：';
            if (!hasUpperCase) missingCharsMessage += '至少一个大写字母；';
            if (!hasLowerCase) missingCharsMessage += '至少一个小写字母；';
            if (!hasNumber) missingCharsMessage += '至少一个数字；';
            if (!hasSpecialChar) missingCharsMessage += '至少一个特殊字符；';
            return {success: false, message: missingCharsMessage.slice(0, -1)}; // 移除末尾的分号
        }
        const existingUser = await prisma.user.findFirst({
            where: {
                OR: [{email}, {username}],
            },
        });
        if (existingUser) {
            setResponseStatus(event, 409);
            let message = '';
            if (existingUser.email === email) {
                message = '此邮箱已被注册';
            } else {
                message = '此用户名已被注册';
            }
            return {success: false, message};
        }
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);
        const newUser = await prisma.user.create({
            data: {
                username,
                email,
                password: hashedPassword,
            },
        });
        const userResponse = {...newUser}; // 创建一个新对象以移除密码
        delete userResponse.password;

        setResponseStatus(event, 201); // 设置 HTTP 状态码为 201 (Created)
        return {success: true, message: '用户注册成功', user: userResponse};
    } catch (error) {
        if (error.code === 'P2002') {
            setResponseStatus(event, 409);
            return {success: false, message: '用户名或邮箱已存在 (数据库层面)'};
        }
        setResponseStatus(event, 500); // 设置 HTTP 状态码为 500 (Internal Server Error)
        return {success: false, message: '服务器内部错误，注册失败'};
    }
});