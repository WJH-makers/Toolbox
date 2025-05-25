import {defineEventHandler, createError, getQuery} from 'h3';
import {translateText} from '~/server/utils/translate.js';

const DELAY_BETWEEN_TRANSLATIONS_MS = 220; // 略大于 1000ms/5次 = 200ms，以确保安全

export default defineEventHandler(async (event) => {
    const queryParams = getQuery(event);
    const originalSearchTerm = queryParams.s || queryParams.q;
    const page = parseInt(queryParams.page) || 1;
    const limit = 5;

    if (!originalSearchTerm) {
        throw createError({statusCode: 400, statusMessage: '必须提供搜索词 (s 或 q 参数)'});
    }

    let searchTermForApi = originalSearchTerm;
    const targetApiLang = 'en';
    const displayLang = 'zh';

    if (/[一-龥]/.test(originalSearchTerm)) {
        try {
            searchTermForApi = await translateText(originalSearchTerm, 'auto', targetApiLang);
        } catch (e) {
            console.error("搜索词翻译失败（将使用原文）:", e);
            // searchTermForApi 仍为 originalSearchTerm
        }
    }

    const apiKey = '1';
    const searchUrl = `https://www.themealdb.com/api/json/v1/${apiKey}/search.php?s=${encodeURIComponent(searchTermForApi)}`;
    let apiResponse;

    try {
        apiResponse = await $fetch(searchUrl, {method: 'GET'});
    } catch (error) {
        console.error('从 TheMealDB API (搜索) 获取数据时出错:', error);
        throw createError({statusCode: 500, statusMessage: '从 TheMealDB (搜索) 获取食谱失败'});
    }

    if (!apiResponse || !apiResponse.meals) {
        return {meals: [], totalMeals: 0, currentPage: page, totalPages: 0, limit: limit};
    }

    const allMealsFromApi = apiResponse.meals;
    const totalMeals = allMealsFromApi.length;
    const totalPages = Math.ceil(totalMeals / limit);
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const paginatedMealsFromApi = allMealsFromApi.slice(startIndex, endIndex);

    const translatedMealSummaries = [];
    for (const meal of paginatedMealsFromApi) {
        let nameToShow = meal.strMeal; // 默认为英文名
        if (meal.strMeal) {
            nameToShow = await translateText(meal.strMeal, targetApiLang, displayLang);
            // 在每次成功或失败的翻译后（translateText内部已处理错误并返回原文）都稍作等待
            if (paginatedMealsFromApi.indexOf(meal) < paginatedMealsFromApi.length - 1) { // 不是最后一个就不需要等待
                await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_TRANSLATIONS_MS));
            }
        }
        translatedMealSummaries.push({
            id: meal.idMeal,
            name: nameToShow, // 如果翻译失败，这里会是英文原文
            imageUrl: meal.strMealThumb,
        });
    }

    return {
        meals: translatedMealSummaries,
        totalMeals: totalMeals,
        currentPage: page,
        totalPages: totalPages,
        limit: limit
    };
});