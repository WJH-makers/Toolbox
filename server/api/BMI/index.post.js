import {defineEventHandler, readBody, createError} from 'h3';
import prisma from '~/server/utils/prisma.js';

export default defineEventHandler(async (event) => {
    if (!event.context.auth) {
        throw createError({
            statusCode: 401,
            statusMessage: 'Unauthorized',
            message: '用户未认证，无法保存健康记录。',
        });
    }

    const userId = event.context.auth.userId;
    const body = await readBody(event);

    // 基本的数据验证 (您可以根据需要添加更严格的验证)
    if (!body || typeof body !== 'object') {
        throw createError({statusCode: 400, statusMessage: 'Bad Request', message: '无效的请求数据。'});
    }

    // 确保核心数据存在，例如至少要有身高体重和BMI之一才记录
    // 这里只是一个简单示例，您可以根据实际计算器情况调整
    if (body.weightKg === undefined && body.heightCm === undefined && body.bmi === undefined) {
        throw createError({statusCode: 400, statusMessage: 'Bad Request', message: '至少需要提供一项健康指标数据。'});
    }

    try {
        const newHealthMetric = await prisma.userHealthMetric.create({
            data: {
                userId: userId,
                recordedAt: body.recordedAt ? new Date(body.recordedAt) : new Date(), // 前端可以传递记录时间，否则默认为当前
                heightCm: body.heightCm,
                weightKg: body.weightKg,
                ageAtRecording: body.ageAtRecording,
                gender: body.gender,
                activityLevel: body.activityLevel,
                neckCm: body.neckCm,
                waistCm: body.waistCm,
                hipCm: body.hipCm,
                bmi: body.bmi,
                bmr: body.bmr,
                tdee: body.tdee,
                bodyFatPercent: body.bodyFatPercent,
                recommendedWaterMl: body.recommendedWaterMl,
                notes: body.notes,
            },
        });
        return {success: true, data: newHealthMetric, message: '健康记录已成功保存！'};
    } catch (error) {
        throw createError({
            statusCode: 500,
            statusMessage: 'Internal Server Error',
            message: '保存健康记录时发生错误，请稍后再试。',
        });
    }
});