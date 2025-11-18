import {defineEventHandler, createError, getQuery} from 'h3';
import {translateText} from '~/server/utils/translate.js'; // 导入翻译辅助函数

export default defineEventHandler(async (event) => {
    const queryParams = getQuery(event);
    const originalIngredientName = queryParams.ingredient || queryParams.i;
    const page = Number(queryParams.page) || 1; // 获取页码，默认为1
    const limit = 5; // 每页固定显示5个菜品

    if (!originalIngredientName) {
        throw createError({
            statusCode: 400,
            statusMessage: '必须提供食材名称 (ingredient 或 i 参数)',
        });
    }

    const targetApiLang = 'en'; // TheMealDB API 使用的语言
    const displayLang = 'zh';   // 我们希望向用户展示的语言
    let ingredientNameToQueryApi = originalIngredientName.trim();

    // 1. 输入翻译：如果原始食材名称是中文，尝试翻译成英文
    if (/[一-龥]/.test(originalIngredientName)) { // 简单判断是否含中文
        try {
            ingredientNameToQueryApi = await translateText(originalIngredientName, 'auto', targetApiLang);
        } catch (e) {
            console.error("食材名称翻译失败:", e);
            throw createError({
                statusCode: 500,
                statusMessage: 'Translation Error',
                message: '翻译食材名称时发生错误。',
            });
        }
    }

    const apiKey = '1';
    const formattedIngredientNameForApi = ingredientNameToQueryApi.replace(/\s+/g, '_');
    const filterUrl = `https://www.themealdb.com/api/json/v1/${apiKey}/filter.php?i=${encodeURIComponent(formattedIngredientNameForApi)}`;
    let apiResponse;

    try {
        apiResponse = await $fetch(filterUrl, {method: 'GET'});
    } catch (error) {
        throw createError({
            statusCode: 500,
            statusMessage: '从 TheMealDB (按食材筛选) 获取食谱失败',
            data: error.message,
        });
    }

    if (!apiResponse || !apiResponse.meals) {
        // 如果API返回 meals: null 或没有 meals 字段，表示没有找到匹配的食谱
        return {meals: [], totalMeals: 0, currentPage: page, totalPages: 0, limit: limit};
    }

    const allMealsFromApi = apiResponse.meals;
    const totalMeals = allMealsFromApi.length;
    const totalPages = Math.ceil(totalMeals / limit);

    // 实现分页：切割出当前页的食谱
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const paginatedMealsFromApi = allMealsFromApi.slice(startIndex, endIndex);


    // 2. 输出翻译：仅将当前页 TheMealDB 返回的英文菜谱名称翻译成中文
    const formattedAndTranslatedMeals = await Promise.all(
        paginatedMealsFromApi.map(async (meal) => {
            let translatedName = meal.strMeal; // 默认为API返回的名称
            try {
                if (meal.strMeal) { // 确保有名称才翻译
                    translatedName = await translateText(meal.strMeal, targetApiLang, displayLang);
                }
            } catch (e) {
                translatedName = `[翻译失败] ${meal.strMeal}`; // 保留原文并标记错误
            }
            return {
                id: meal.idMeal,
                name: translatedName,
                imageUrl: meal.strMealThumb,
            };
        })
    );

    return {
        meals: formattedAndTranslatedMeals,
        totalMeals: totalMeals,
        currentPage: page,
        totalPages: totalPages,
        limit: limit
    };
});