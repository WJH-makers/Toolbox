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
    console.log(`[Stock List Proxy] Attempting to call: ${targetUrl}`);

    let rawTextResponse = ''; // 用于存储原始文本响应

    try {
        // 1. 先尝试以文本形式获取响应
        rawTextResponse = await $fetch(targetUrl, {
            method: 'GET',
            responseType: 'text' // 获取原始文本，而不是尝试自动解析
        });

        console.log('[Stock List Proxy] Raw external API response text (first 500 chars):', rawTextResponse.substring(0, 500));

        // 2. 尝试手动解析JSON
        let parsedResponse;
        try {
            // 如果响应可能包含BOM，可以先移除它
            if (rawTextResponse.charCodeAt(0) === 0xFEFF) {
                console.log('[Stock List Proxy] BOM detected, removing it.');
                rawTextResponse = rawTextResponse.substring(1);
            }
            parsedResponse = JSON.parse(rawTextResponse);
        } catch (parseError) {
            console.error('[Stock List Proxy] JSON parsing failed:', parseError.message);
            console.error('[Stock List Proxy] Offending text (first 200 chars):', rawTextResponse.substring(0, 200)); // 打印导致错误的部分文本
            throw createError({
                statusCode: 502, // Bad Gateway，因为上游响应无法解析
                statusMessage: 'Bad Gateway - Invalid JSON response from external API',
                message: `从外部API获取的股票列表数据格式无效: ${parseError.message}`
            });
        }

        // 3. 处理成功解析后的数据
        // console.log('[Stock List Proxy] Parsed external API response:', JSON.stringify(parsedResponse, null, 2)); // 可选：完整打印解析后的对象

        if (parsedResponse && Array.isArray(parsedResponse)) {
            // Mairui API 直接返回了数组，符合 /hslt/list/ 文档描述
            return {code: 200, msg: '数据请求成功', data: parsedResponse};
        } else if (parsedResponse && parsedResponse.code === 200 && Array.isArray(parsedResponse.data)) {
            // Mairui API 返回了 {code, msg, data} 结构
            return parsedResponse;
        } else {
            // 结构不符合预期
            console.error('[Stock List Proxy] Unexpected parsed response structure from external API:', parsedResponse);
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
            console.error(`[Stock List Proxy] Error already processed: ${error.statusCode} - ${error.message}`);
            throw error; // 直接重新抛出
        }

        // 对于 $fetch 直接抛出的原始错误
        console.error('[Stock List Proxy] Error fetching from external API:', error.message);
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