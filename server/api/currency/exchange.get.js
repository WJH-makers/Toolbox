import {defineEventHandler, getQuery, createError} from 'h3';

const EXTERNAL_API_URL_EXCHANGE = 'https://v2.xxapi.cn/api/exchange';

export default defineEventHandler(async (event) => {
    const query = getQuery(event);
    const {from, to, amount} = query;

    if (!from || !to || !amount || isNaN(parseFloat(String(amount)))) {
        throw createError({
            statusCode: 400,
            statusMessage: 'Bad Request',
            message: '缺少或无效的查询参数: from, to, amount。',
        });
    }

    const targetUrl = `${EXTERNAL_API_URL_EXCHANGE}?from=${encodeURIComponent(String(from))}&to=${encodeURIComponent(String(to))}&amount=${encodeURIComponent(String(amount))}`;

    try {
        const externalResponse = await $fetch(targetUrl, {method: 'GET', parseResponse: JSON.parse});

        if (externalResponse && externalResponse.code === 200 && externalResponse.data) {
            if (event.context.auth && event.context.auth.userId) {
                try {
                    await prisma.userExchangeQuery.create({
                        data: {
                            userId: event.context.auth.userId,
                            fromCurrency: String(from),
                            toCurrency: String(to),
                            amount: parseFloat(String(amount)),
                            result: parseFloat(externalResponse.data.result),
                            rate: parseFloat(externalResponse.data.rate),
                        }
                    });
                } catch (dbError) {
                    console.error("[Currency Exchange Proxy] Failed to save query history:", dbError);
                }
            }
            return {
                success: true,
                data: externalResponse.data,
                msg: externalResponse.msg || '数据请求成功'
            };
        } else {
            throw createError({
                statusCode: externalResponse?.code || 500,
                statusMessage: 'External API Error',
                message: externalResponse?.msg || '从汇率服务获取数据失败或返回数据格式不正确。',
            });
        }
    } catch (error) {
        throw createError({
            statusCode: error.statusCode || 502,
            statusMessage: error.statusMessage || 'Bad Gateway',
            message: error.data?.message || error.message || '无法连接到汇率服务或服务出错。',
        });
    }
});