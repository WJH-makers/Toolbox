// server/api/auth/register.post.js
import prisma from '~/server/utils/prisma';
import bcrypt from 'bcryptjs';


export default defineEventHandler(async (event) => {
    try {
        const body = await readBody(event); // Nuxt 3 读取请求体的工具函数
        const {username, email, password} = body;
        // 1. 基本输入验证 (所有字段均为必填项)
        if (!username || !email || !password) {
            setResponseStatus(event, 400); // 设置 HTTP 状态码为 400 (Bad Request)
            return {success: false, message: '用户名、邮箱和密码均为必填项'};
        }

        // 2. 邮箱格式验证
        // 一个相对通用的邮箱正则表达式
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            setResponseStatus(event, 400);
            return {success: false, message: '请输入有效的邮箱地址'};
        }

        // 3. 密码强度验证
        // 3a. 密码最小长度 (例如，至少8位)
        if (password.length < 8) {
            setResponseStatus(event, 400);
            return {success: false, message: '密码长度至少需要8位'};
        }

        // 3b. 密码复杂度检查 (示例：至少包含一个大写字母、一个小写字母和一个数字)
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
            setResponseStatus(event, 409); // 设置 HTTP 状态码为 409 (Conflict)
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
                password: hashedPassword, // 存储哈希后的密码
            },
        });


        const userResponse = {...newUser}; // 创建一个新对象以移除密码
        delete userResponse.password;

        setResponseStatus(event, 201); // 设置 HTTP 状态码为 201 (Created)
        return {success: true, message: '用户注册成功', user: userResponse};

    } catch (error) {
        console.error('注册时发生错误:', error);
        if (error.code === 'P2002') {
            setResponseStatus(event, 409);
            return {success: false, message: '用户名或邮箱已存在 (数据库层面)'};
        }

        setResponseStatus(event, 500); // 设置 HTTP 状态码为 500 (Internal Server Error)
        return {success: false, message: '服务器内部错误，注册失败'};
    }
});