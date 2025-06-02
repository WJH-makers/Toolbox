import {defineEventHandler, createError, getQuery} from 'h3';
export default defineEventHandler(async (event) => {
    const queryParams = getQuery(event);
    const mealId = queryParams.id || queryParams.i;

    if (!mealId) {
        throw createError({statusCode: 400, statusMessage: '必须提供食谱ID (id 或 i 参数)'});
    }

    const apiKey = '1';
    const lookupUrl = `https://www.themealdb.com/api/json/v1/${apiKey}/lookup.php?i=${encodeURIComponent(mealId)}`;

    try {
        const response = await $fetch(lookupUrl, {method: 'GET'});

        if (!response || !response.meals || response.meals.length === 0) {
            throw createError({statusCode: 404, statusMessage: `未找到ID为 '${mealId}' 的食谱`});
        }

        const meal = response.meals[0];
        // 直接格式化从 TheMealDB 获取的数据，不进行翻译
        const ingredients = [];
        for (let i = 1; i <= 20; i++) {
            const ingredientName = meal[`strIngredient${i}`];
            const measure = meal[`strMeasure${i}`];
            if (ingredientName && ingredientName.trim() !== '') {
                ingredients.push({
                    name: ingredientName.trim(), // 保持英文
                    measure: measure ? measure.trim() : '', // 保持英文
                });
            } else {
                break;
            }
        }

        const formattedMeal = {
            id: meal.idMeal,
            name: meal.strMeal, // 保持英文
            category: meal.strCategory, // 保持英文
            area: meal.strArea, // 保持英文
            instructions: meal.strInstructions, // 保持英文
            imageUrl: meal.strMealThumb,
            tags: meal.strTags ? meal.strTags.split(',').map(tag => tag.trim()) : [], // 标签也可能是英文
            youtubeUrl: meal.strYoutube,
            sourceUrl: meal.strSource,
            ingredients: ingredients,
        };

        return formattedMeal;

    } catch (error) {
        if (error.statusCode === 404) throw error;
        throw createError({statusCode: 500, statusMessage: `从 TheMealDB (按ID查询详情) 获取食谱 '${mealId}' 失败`});
    }
});