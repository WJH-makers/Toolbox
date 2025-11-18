import {defineEventHandler, createError} from 'h3';

const licence = process.env.MAIRUI_API_LICENCE;
const baseUrl = process.env.MAIRUI_BASE_URL;

export default defineEventHandler(async (event) => { // eslint-disable-line no-unused-vars
    if (!licence || !baseUrl) {
        throw createError({
            statusCode: 500,
            statusMessage: 'API configuration missing on server.',
            message: '服务器API配置缺失。'
        });
    }
    const targetUrl = `${baseUrl}/hslt/list/${licence}`;


    let rawTextResponse = ''; // 用于存储原始文本响应

    try {
        // 1. 先尝试以文本形式获取响应
        rawTextResponse = await $fetch(targetUrl, {
            method: 'GET',
            transform: (response) => response,
        });
        // 2. 尝试手动解析JSON
        let parsedResponse;
        try {
            parsedResponse = JSON.parse(rawTextResponse);
        } catch (parseError) {
            throw createError({
                statusCode: 502, // Bad Gateway，因为上游响应无法解析
                statusMessage: 'Bad Gateway - Invalid JSON response from external API',
                message: `从外部API获取的股票列表数据格式无效: ${parseError.message}`
            });
        }
        if (parsedResponse && Array.isArray(parsedResponse)) {
            // Mairui API 直接返回了数组，符合 /hslt/list/ 文档描述
            return {code: 200, msg: '数据请求成功', data: parsedResponse};
        } else if (parsedResponse && parsedResponse.code === 200 && Array.isArray(parsedResponse.data)) {
            // Mairui API 返回了 {code, msg, data} 结构
            return parsedResponse;
        } else {
            throw createError({
                statusCode: 502, // Bad Gateway
                statusMessage: 'Bad Gateway - Unexpected data structure from external API',
                message: parsedResponse?.msg || parsedResponse?.reason || '获取股票列表失败或外部API返回格式不正确。'
            });
        }

    } catch (error) {
        console.error('[Stock List Proxy] Error fetching stock list:', error);
        throw createError({
            statusCode: 502,
            statusMessage: 'Bad Gateway',
            message: '从外部API获取股票列表时发生错误。',
        });
    }
});