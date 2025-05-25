import {defineEventHandler, readBody, createError} from 'h3';
import {translateText} from '~/server/utils/translate.js';

const TRANSLATION_BATCH_SIZE = 4;
const DELAY_BETWEEN_BATCHES_MS = 1000; // 批次之间延迟1秒，每批最多4个，确保在5次/秒内

async function translateField(text, sourceLang = 'en', targetLang = 'zh') {
    if (!text || typeof text !== 'string' || !text.trim()) {
        return text;
    }
    return await translateText(text, sourceLang, targetLang); // translateText 现在会在失败时返回原文
}

export default defineEventHandler(async (event) => {
    const recipeDataToTranslate = await readBody(event);

    if (!recipeDataToTranslate || typeof recipeDataToTranslate !== 'object') {
        throw createError({statusCode: 400, statusMessage: '无效的请求体'});
    }

    const translatedRecipe = JSON.parse(JSON.stringify(recipeDataToTranslate));
    const translationTasks = [];

    if (translatedRecipe.name) translationTasks.push(async () => {
        translatedRecipe.name = await translateField(translatedRecipe.name);
    });
    if (translatedRecipe.category) translationTasks.push(async () => {
        translatedRecipe.category = await translateField(translatedRecipe.category);
    });
    if (translatedRecipe.area) translationTasks.push(async () => {
        translatedRecipe.area = await translateField(translatedRecipe.area);
    });
    if (translatedRecipe.instructions) translationTasks.push(async () => {
        translatedRecipe.instructions = await translateField(translatedRecipe.instructions);
    });

    if (translatedRecipe.ingredients && Array.isArray(translatedRecipe.ingredients)) {
        translatedRecipe.ingredients.forEach(ingredient => {
            if (ingredient.name) translationTasks.push(async () => {
                ingredient.name = await translateField(ingredient.name);
            });
            if (ingredient.measure) translationTasks.push(async () => {
                ingredient.measure = await translateField(ingredient.measure);
            });
        });
    }

    if (translatedRecipe.tags && Array.isArray(translatedRecipe.tags)) {
        for (let i = 0; i < translatedRecipe.tags.length; i++) {
            const tag = translatedRecipe.tags[i];
            if (tag && typeof tag === 'string') {
                translationTasks.push(async () => {
                    translatedRecipe.tags[i] = await translateField(tag);
                });
            }
        }
    }

    for (let i = 0; i < translationTasks.length; i += TRANSLATION_BATCH_SIZE) {
        const batch = translationTasks.slice(i, i + TRANSLATION_BATCH_SIZE);
        try {
            await Promise.all(batch.map(task => task()));
        } catch (batchError) {
            console.error("翻译批次中发生错误:", batchError);
        }
        if (i + TRANSLATION_BATCH_SIZE < translationTasks.length) {
            await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_BATCHES_MS));
        }
    }
    return translatedRecipe;
});