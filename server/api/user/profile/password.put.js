import {defineEventHandler, readBody, setResponseStatus} from 'h3'; // 引入 setResponseStatus
import prisma from '~/server/utils/prisma';
import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 10;
const MIN_PASSWORD_LENGTH = 8; // 设置新密码的最小长度

export default defineEventHandler(async (event) => {
    const userId = event.context.auth?.userId;
    if (!userId) {
        setResponseStatus(event, 401); // Unauthorized
        return {success: false, error: '用户未授权'};
    }

    const body = await readBody(event);
    const {currentPassword, newPassword} = body;

    // 1. 基本的非空检查
    if (!currentPassword || !newPassword) {
        setResponseStatus(event, 400); // Bad Request
        return {success: false, error: '当前密码和新密码均不能为空'};
    }

    // 2. 新密码强度验证
    // 2a. 最小长度检查
    if (newPassword.length < MIN_PASSWORD_LENGTH) {
        setResponseStatus(event, 400);
        return {success: false, error: `新密码长度至少需要 ${MIN_PASSWORD_LENGTH} 位`};
    }

    // 2b. 复杂度检查
    const hasUpperCase = /[A-Z]/.test(newPassword);
    const hasLowerCase = /[a-z]/.test(newPassword);
    const hasNumber = /[0-9]/.test(newPassword);
    // const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\\/?]+/.test(newPassword); // 可选：特殊字符检查

    const strengthValidationErrors = [];
    if (!hasUpperCase) {
        strengthValidationErrors.push('大写字母');
    }
    if (!hasLowerCase) {
        strengthValidationErrors.push('小写字母');
    }
    if (!hasNumber) {
        strengthValidationErrors.push('数字');
    }
    if (strengthValidationErrors.length > 0) {
        setResponseStatus(event, 400);
        return {success: false, error: `新密码必须至少包含：${strengthValidationErrors.join('、')}`};
    }

    // 2c. （可选）新旧密码不能相同
    if (currentPassword === newPassword) {
        setResponseStatus(event, 400);
        return {success: false, error: '新密码不能与当前密码相同'};
    }
    try {
        const user = await prisma.user.findUnique({
            where: {id: userId},
        });

        if (!user) {
            setResponseStatus(event, 404); // Not Found
            return {success: false, error: '用户不存在'};
        }
        // 3. 验证当前密码是否正确
        const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
        if (!isCurrentPasswordValid) {
            setResponseStatus(event, 400); // Bad Request (或 401/403 表示认证相关失败)
            return {success: false, error: '当前密码不正确'};
        }

        // 4. 哈希新密码
        const hashedNewPassword = await bcrypt.hash(newPassword, SALT_ROUNDS);

        // 5. 更新数据库中的密码
        await prisma.user.update({
            where: {id: userId},
            data: {password: hashedNewPassword},
        });
        setResponseStatus(event, 200); // OK
        return {success: true, message: '密码修改成功！'};

    } catch (error) {
        console.error('修改密码失败:', error);
        setResponseStatus(event, 500); // Internal Server Error
        return {success: false, error: '修改密码时发生服务器内部错误'};
    }
});