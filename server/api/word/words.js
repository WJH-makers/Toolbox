// server/api/words.js
import {createError, defineEventHandler, getQuery} from 'h3';
import fs from 'node:fs/promises';
import path from 'node:path';

const PREPROCESSED_FROM_TXT_JSON_PATH = path.join(process.cwd(), 'data', 'translated-words.json');

async function loadPreprocessedWordsFromFile() {
    console.log(`[API] 尝试加载预处理的单词JSON文件: ${PREPROCESSED_FROM_TXT_JSON_PATH}`);
    try {
        const fileContent = await fs.readFile(PREPROCESSED_FROM_TXT_JSON_PATH, 'utf-8');
        const jsonData = JSON.parse(fileContent);
        // 基本验证，确保它是一个数组
        if (Array.isArray(jsonData)) {
            console.log(`[API] 成功从 ${PREPROCESSED_FROM_TXT_JSON_PATH} 加载了 ${jsonData.length} 个单词。`);
            return jsonData;
        } else {
            console.error(`[API] 错误: ${PREPROCESSED_FROM_TXT_JSON_PATH} 的内容不是一个有效的JSON数组。`);
            throw createError({statusCode: 500, statusMessage: '预处理的单词数据格式无效。'});
        }
    } catch (error) {
        if (error.code === 'ENOENT') {
            console.error(`[API] 错误: 预处理的单词JSON文件未找到位于 ${PREPROCESSED_FROM_TXT_JSON_PATH}`);
            throw createError({statusCode: 404, statusMessage: '请求的自定义单词列表（预处理JSON）未找到。'});
        }
        console.error(`[API] 读取或解析预处理的单词JSON文件时出错 (${PREPROCESSED_FROM_TXT_JSON_PATH}):`, error);
        throw createError({statusCode: 500, statusMessage: '服务器无法读取或解析预处理的单词数据。'});
    }
}

export default defineEventHandler(async (event) => {
    const query = getQuery(event);
    const dataSourceType = (query.source || 'json').toLowerCase();
    const listName = (query.list || 'common').toLowerCase();
    if (dataSourceType === 'txt') {
        console.log(`[API] 请求加载通过 'txt' 源指定的预处理JSON单词列表...`);
        return await loadPreprocessedWordsFromFile();
    } else if (dataSourceType === 'json') {
        try {
            console.log(`[API] 请求加载常规 JSON 列表: ${listName}.json`);
            const jsonDataModule = await import(`~/data/${listName}.json`);
            const jsonData = jsonDataModule.default || jsonDataModule;
            return jsonData;
        } catch (error) {
            console.error(`[API] 无法加载 JSON 列表 '${listName}.json':`, error);
            throw createError({
                statusCode: 404,
                statusMessage: `JSON 单词列表 '${listName}' 未找到。请确保文件存在于 'server/data/' 目录中，并且 'list' 参数 (${listName}) 与文件名 (不含.json) 匹配。`,
            });
        }
    } else {
        throw createError({
            statusCode: 400,
            statusMessage: `无效的 'source' 参数。请使用 'json' 或 'txt' (txt现在指向预处理的自定义列表)。`,
        });
    }
});