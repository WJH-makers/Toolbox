import {defineEventHandler, createError} from 'h3';
import prisma from '~/server/utils/prisma'; // 确保 Prisma Client 实例可用

const EXTERNAL_API_URL_ALLRATES = 'https://v2.xxapi.cn/api/allrates';
const DB_CACHE_DURATION_MS = 60 * 60 * 1000;

export default defineEventHandler(async () => {
    const baseCurrencyForDb = 'USD';
    try {
        // 1. 尝试从数据库获取缓存的汇率 (以USD为基准)
        const cachedRates = await prisma.exchangeRate.findMany({
            where: {
                baseCurrency: baseCurrencyForDb,
                updatedAt: {
                    gte: new Date(Date.now() - DB_CACHE_DURATION_MS)
                }
            },
            orderBy: {targetCurrency: 'asc'}
        });
        if (cachedRates.length > 0) {
            console.log(`[AllRates API] Serving ${baseCurrencyForDb} rates from DB cache.`);
            const formattedRates = {};
            let cacheTimestamp = null;
            cachedRates.forEach(r => {
                formattedRates[r.targetCurrency] = {name: r.name, rate: r.rate};
                if (!cacheTimestamp || r.updatedAt > cacheTimestamp) {
                    cacheTimestamp = r.updatedAt;
                }
            });
            return {
                success: true,
                data: {
                    base: baseCurrencyForDb,
                    rates: formattedRates,
                    count: cachedRates.length,
                    update_at: cacheTimestamp ? cacheTimestamp.getTime() : Date.now()
                },
                msg: '从数据库缓存获取汇率数据成功。'
            };
        }

        // 2. 如果缓存未命中或已过期，从外部API获取
        console.log(`[AllRates API] Fetching all rates from external API (base ${baseCurrencyForDb}).`);
        const externalResponse = await $fetch(EXTERNAL_API_URL_ALLRATES, {parseResponse: JSON.parse});
        if (externalResponse.code === 200 && externalResponse.data && externalResponse.data.rates) {
            const fetchedRatesObject = externalResponse.data.rates;
            const sourceUpdateTimestamp = new Date(externalResponse.data.update_at || Date.now());
            const dbRecordTimestamp = new Date();
            const dbOperations = Object.keys(fetchedRatesObject).map(targetCode => {
                const rateData = fetchedRatesObject[targetCode];
                return prisma.exchangeRate.upsert({
                    where: {baseCurrency_targetCurrency: {baseCurrency: baseCurrencyForDb, targetCurrency: targetCode}},
                    update: {
                        rate: rateData.rate,
                        name: rateData.name,
                        updatedAt: dbRecordTimestamp,
                        source: 'v2.xxapi.cn'
                    },
                    create: {
                        baseCurrency: baseCurrencyForDb,
                        targetCurrency: targetCode,
                        rate: rateData.rate,
                        name: rateData.name,
                        updatedAt: dbRecordTimestamp,
                        source: 'v2.xxapi.cn'
                    },
                });
            });
            await prisma.$transaction(dbOperations);
            console.log(`[AllRates API] Updated DB with ${dbOperations.length} rates based on ${baseCurrencyForDb}.`);
            return {
                success: true,
                data: {
                    base: baseCurrencyForDb, // 明确我们返回的是USD为基础的
                    rates: fetchedRatesObject,
                    count: externalResponse.data.count,
                    update_at: sourceUpdateTimestamp.getTime() // 使用API源的更新时间
                },
                msg: '从外部API获取汇率数据并已更新数据库。'
            };
        } else {
            throw createError({
                statusCode: 500,
                statusMessage: 'External API Error',
                message: externalResponse.msg || '获取所有汇率失败。'
            });
        }
    } catch (error) {
        console.error('[AllRates API] Error:', error);
        throw createError({
            statusCode: error.statusCode || 500,
            statusMessage: error.statusMessage || 'Internal Server Error',
            message: error.data?.message || error.message || '获取汇率表时出错。',
        });
    }
});