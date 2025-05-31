import {defineEventHandler, getQuery, createError} from 'h3';

const licence = process.env.MAIRUI_API_LICENCE;
const baseUrl = process.env.MAIRUI_BASE_URL;
export default defineEventHandler(async (event) => {
    if (!licence || !baseUrl) {
        throw createError({statusCode: 500, statusMessage: 'API configuration missing on server.'});
    }
    const query = getQuery(event);
    let {stockCode} = query;
    if (!stockCode) {
        throw createError({statusCode: 400, statusMessage: 'Bad Request', message: 'Missing stockCode parameter.'});
    }
    const targetUrl = `${baseUrl}/hsrl/ssjy/${encodeURIComponent(stockCode)}/${licence}`;
    console.log(`[Stock Quote Proxy] Calling: ${targetUrl}`);

    try {
        const response = await $fetch(targetUrl, {method: 'GET', parseResponse: JSON.parse});

        if (response && typeof response.p !== 'undefined') {
            return {code: 200, msg: '数据请求成功', data: response};
        } else {
            console.warn('[Stock Quote Proxy] Unexpected response structure or error from external API:', response);
            throw createError({
                statusCode: 400,
                statusMessage: 'API Error',
                message: response.msg || 'Failed to fetch stock quote'
            });
        }
    } catch (error) {
        console.error('[Stock Quote Proxy] Error:', error);
        throw createError({
            statusCode: error.statusCode || 502,
            statusMessage: error.statusMessage || 'Bad Gateway',
            message: error.data?.message || error.message || 'Error fetching stock quote from external API.',
        });
    }
});