import {defineEventHandler, getQuery, createError} from 'h3';

// 从环境变量中获取配置
const licence = process.env.MAIRUI_API_LICENCE; // 你的 licence 证书
const baseUrl = process.env.MAIRUI_BASE_URL;   // Mairui API 的基础URL (应为 https://api.mairui.club)

export default defineEventHandler(async (event) => {
    if (!licence || !baseUrl) {
        throw createError({
            statusCode: 500,
            statusMessage: 'API configuration missing on server (MAIRUI_API_LICENCE or MAIRUI_BASE_URL).',
            message: '服务器API配置缺失。'
        });
    }

    const queryFromFrontend = getQuery(event);
    const stockCode = String(queryFromFrontend.stockCode); // 从前端获取股票代码
    const timeLevel = String(queryFromFrontend.timeLevel); // 从前端获取分时级别

    if (!stockCode || stockCode === 'undefined' || !timeLevel || timeLevel === 'undefined') {
        throw createError({
            statusCode: 400,
            statusMessage: 'Bad Request',
            message: '前端缺少 stockCode 或 timeLevel 参数。'
        });
    }

    // **重要更新：使用历史数据接口路径 /hszbl/fsjy/**
    const targetUrl = `${baseUrl}/hszbl/fsjy/${encodeURIComponent(stockCode)}/${encodeURIComponent(timeLevel)}/${encodeURIComponent(licence)}`;
    try {
        const responseData = await $fetch(targetUrl, {
            method: 'GET',
            parseResponse: JSON.parse // 假设API直接返回JSON
        });
        if (Array.isArray(responseData)) {
            return {code: 200, msg: '历史K线数据请求成功', data: responseData};
        } else if (responseData && typeof responseData === 'object' && typeof responseData.code !== 'undefined') {
            // 处理Mairui API可能返回的错误对象 {code, msg, ...}
            const statusCode = responseData.code === 0 ? 400 : (Number.isInteger(responseData.code) && responseData.code !== 200 ? responseData.code : 500);
            throw createError({
                statusCode: statusCode,
                statusMessage: 'Mairui API Error',
                message: responseData.msg || `从Mairui API获取历史K线数据失败 (code: ${responseData.code})`
            });
        } else if (responseData && typeof responseData === 'object' && !Array.isArray(responseData) && responseData.d && responseData.c) {
            return {code: 200, msg: '历史K线数据请求成功 (返回单个数据点被包装为数组)', data: [responseData]};
        } else {
            throw createError({
                statusCode: 502,
                statusMessage: 'Bad Gateway',
                message: '从外部历史K线API获取的响应格式非预期。'
            });
        }
    } catch (error) {
        const statusCode = error.response?.status || error.statusCode || 500;
        const statusMessage = error.response?.statusText || error.statusMessage || 'External API Call Failed';
        const message = error.data?.message || error.data?.msg || error.message || '从外部API获取历史K线数据时发生错误。';

        throw createError({
            statusCode: statusCode,
            statusMessage: statusMessage,
            message: message,
        });
    }
});