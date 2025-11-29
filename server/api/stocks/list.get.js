import {defineEventHandler, createError} from 'h3';

const licence = process.env.MAIRUI_API_LICENCE;
const baseUrl = process.env.MAIRUI_BASE_URL;

export default defineEventHandler(async (event) => {
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
            responseType: 'text' // 获取原始文本，而不是尝试自动解析
        });
        // 2. 尝试手动解析JSON
        let parsedResponse;
        try {
            // 如果响应可能包含BOM，可以先移除它
            if (rawTextResponse.charCodeAt(0) === 0xFEFF) {
                rawTextResponse = rawTextResponse.substring(1);
            }
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
        // 这个 catch 块现在主要捕获 $fetch 本身的错误 (如网络问题, HTTP 状态码错误)
        // 或者上面手动抛出的 createError

        if (error.statusCode && error.statusMessage) { // 如果是已通过 createError 包装的错误
            throw error; // 直接重新抛出
        }
        if (error.response) { // $fetch 错误对象可能包含 response
            console.error('[Stock List Proxy] External API status:', error.response.status);
            console.error('[Stock List Proxy] External API response data (if any):', await error.response.text().catch(() => 'Could not read error response text'));
        } else {
            console.error('[Stock List Proxy] Raw text that might have caused fetch error (if available):', rawTextResponse.substring(0, 200));
        }

        throw createError({
            statusCode: error.statusCode || 502,
            statusMessage: error.statusMessage || 'Bad Gateway',
            message: error.data?.message || error.data?.msg || error.message || '从外部API获取股票列表时发生错误。',
        });
    }
});