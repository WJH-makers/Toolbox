import fs from 'node:fs/promises';
import path from 'node:path';
import {tmt} from "tencentcloud-sdk-nodejs";


const INPUT_TXT_FILE_PATH = path.resolve(process.cwd(), 'public', 'word', 'words.txt');
const OUTPUT_JSON_FILE_PATH = path.resolve(process.cwd(), 'public', 'word', 'translated-words.json');
const API_BATCH_SIZE = 5;
const DELAY_BETWEEN_BATCHES_MS = 1200;
const TmtClient = tmt.v20180321.Client;
const secretId = "AKIDELGxQfniYDi04uXxA8sOpAICsLbglgOs";
const secretKey = "M4e083kFYdUSEn9KRL1TijV3NTN6QYUE";
const region = process.env.TENCENT_TRANSLATE_REGION || "ap-guangzhou";
let tencentTranslateClient;

if (secretId && secretKey) {
    const clientConfig = {
        credential: {secretId, secretKey},
        region,
        profile: {httpProfile: {endpoint: "tmt.tencentcloudapi.com"}},
    };
    tencentTranslateClient = new TmtClient(clientConfig);
    console.log("[Tencent Translate] 客户端初始化成功。");
} else {
    console.warn("警告：腾讯翻译API的 SecretId 或 SecretKey 未配置。翻译功能将受限或失败。");
}

async function translateTextWithTencent(text, sourceLang = 'auto', targetLang = 'zh') {
    const originalText = text;
    if (!tencentTranslateClient) {
        console.error("  [Tencent Translate] 客户端未初始化。将返回原文。");
        return originalText;
    }
    if (!text || typeof text !== 'string' || !text.trim()) return originalText;
    const params = {SourceText: text, Source: sourceLang, Target: targetLang, ProjectId: 0};
    try {
        const data = await tencentTranslateClient.TextTranslate(params);
        if (data && data.TargetText) return data.TargetText;
        console.error(`  [Tencent Translate] 翻译错误: 响应中没有 TargetText (原文: "${originalText.substring(0, 50)}...")`, data);
        return originalText;
    } catch (err) {
        console.error(`  [Tencent Translate] API调用失败 (原文: "${originalText.substring(0, 50)}..."): Code=${err.code}, Msg=${err.message}, RequestId=${err.requestId}`);
        return originalText;
    }
}

async function loadExistingProcessedData() {
    try {
        console.log(`尝试读取已处理文件: ${OUTPUT_JSON_FILE_PATH}`);
        const fileContent = await fs.readFile(OUTPUT_JSON_FILE_PATH, 'utf-8');
        const data = JSON.parse(fileContent);
        if (Array.isArray(data)) {
            console.log(`成功从 "${OUTPUT_JSON_FILE_PATH}" 加载了 ${data.length} 条已处理的记录。`);
            return data;
        }
        console.warn(`警告: "${OUTPUT_JSON_FILE_PATH}" 文件内容不是一个有效的JSON数组。将视为空白并从头开始。`);
        return [];
    } catch (error) {
        if (error.code === 'ENOENT') {
            console.log(`信息: 输出文件 "${OUTPUT_JSON_FILE_PATH}" 不存在，将创建新文件。`);
        } else {
            console.warn(`警告: 读取或解析 "${OUTPUT_JSON_FILE_PATH}" 文件失败 (可能是无效或损坏的JSON)。将视为空白并从头开始。错误详情: ${error.message}`);
        }
        return [];
    }
}

async function saveProcessedData(wordsData) {
    try {
        const outputDir = path.dirname(OUTPUT_JSON_FILE_PATH);
        await fs.mkdir(outputDir, {recursive: true});
        await fs.writeFile(OUTPUT_JSON_FILE_PATH, JSON.stringify(wordsData, null, 2), 'utf-8');
    } catch (error) {
        console.error(`错误: 无法写入输出文件 "${OUTPUT_JSON_FILE_PATH}".`, error);
    }
}


async function preprocessWords() {
    console.log(`开始预处理单词... (输入: ${INPUT_TXT_FILE_PATH}, 输出: ${OUTPUT_JSON_FILE_PATH})`);
    if (!tencentTranslateClient) {
        console.error("错误：腾讯翻译客户端未配置，无法继续处理。请检查您的API密钥配置。");
        process.exit(1);
    }

    let allProcessedWords = await loadExistingProcessedData();
    const processedEnglishSet = new Set(allProcessedWords.map(w => w.english.toLowerCase())); // 确保使用小写进行比较

    let fileContent;
    try {
        fileContent = await fs.readFile(INPUT_TXT_FILE_PATH, 'utf-8');
    } catch (error) {
        console.error(`错误: 无法读取输入单词列表文件 "${INPUT_TXT_FILE_PATH}".`, error);
        process.exit(1);
    }

    const englishWordsFromTxtRaw = fileContent.split(/\r?\n/).map(line => line.trim().toLowerCase());
    const allUniqueEnglishWordsFromTxt = Array.from(new Set(englishWordsFromTxtRaw.filter(word => /^[a-z'-]+$/i.test(word) && word.length > 0)));

    const wordsToProcessThisRun = allUniqueEnglishWordsFromTxt.filter(word => !processedEnglishSet.has(word));

    if (wordsToProcessThisRun.length === 0) {
        console.log(`所有来自 "${INPUT_TXT_FILE_PATH}" 的单词（共 ${allUniqueEnglishWordsFromTxt.length} 个独立单词）均已在 "${OUTPUT_JSON_FILE_PATH}" 中找到。无需处理新单词。`);
        if (allProcessedWords.length > 0) {
            await saveProcessedData(allProcessedWords);
        } else {
            try {
                await fs.access(OUTPUT_JSON_FILE_PATH);
            } catch {
                await saveProcessedData([]);
                console.log(`已创建空的JSON输出文件: ${OUTPUT_JSON_FILE_PATH}`);
            }
        }
        return;
    }
    console.log(`从TXT文件读取到 ${allUniqueEnglishWordsFromTxt.length} 个独立单词。`);
    console.log(`已处理的单词数量 (从JSON加载): ${processedEnglishSet.size} 个。`);
    console.log(`本次需要处理的新单词数量: ${wordsToProcessThisRun.length} 个。`);
    const totalWordsToProcessThisRun = wordsToProcessThisRun.length;
    for (let i = 0; i < totalWordsToProcessThisRun; i += API_BATCH_SIZE) {
        const batchWords = wordsToProcessThisRun.slice(i, i + API_BATCH_SIZE);
        const currentBatchNumber = Math.floor(i / API_BATCH_SIZE) + 1;
        const totalBatches = Math.ceil(totalWordsToProcessThisRun / API_BATCH_SIZE);
        console.log(`\n处理新单词批次 ${currentBatchNumber} / ${totalBatches} (单词 ${i + 1} - ${Math.min(i + API_BATCH_SIZE, totalWordsToProcessThisRun)} of ${totalWordsToProcessThisRun})...`);
        const batchPromises = batchWords.map(async (engWord, indexInBatch) => {
            const logPrefix = `    [新-${currentBatchNumber}-${indexInBatch + 1}] "${engWord}"`;
            const wordEntry = {
                id: `custom-txt-${engWord.replace(/[^a-z0-9]/gi, '')}-${Date.now()}`, // ID 中移除非字母数字字符
                english: engWord,
                chinese: engWord,
                tags: ['custom-txt-translated'],
            };
            try {
                wordEntry.chinese = await translateTextWithTencent(engWord, 'en', 'zh');
                console.log(`${logPrefix}: 完成 -> 中文:"${wordEntry.chinese}"`);
            } catch (error) {
                console.error(`${logPrefix}: 翻译过程中发生错误:`, error);
            }
            return wordEntry;
        });
        try {
            const newlyProcessedBatchResults = await Promise.all(batchPromises);
            allProcessedWords.push(...newlyProcessedBatchResults);
            await saveProcessedData(allProcessedWords);
            console.log(`批次 ${currentBatchNumber} 处理完成并已保存进度。当前总计 ${allProcessedWords.length} 条记录。`);
        } catch (error) {
            console.error(`批次 ${currentBatchNumber} 处理时发生意外错误:`, error);
        }
        if (i + API_BATCH_SIZE < totalWordsToProcessThisRun) {
            console.log(`等待 ${DELAY_BETWEEN_BATCHES_MS / 1000} 秒后开始下一批次...`);
            await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_BATCHES_MS));
        }
    }
    console.log(`\n所有新单词处理完毕。`);
    await saveProcessedData(allProcessedWords);
    console.log(`最终结果已保存到: ${OUTPUT_JSON_FILE_PATH} (共 ${allProcessedWords.length} 条记录)`);
}

preprocessWords().catch(error => {
    console.error("预处理脚本发生未捕获的严重错误:", error);
    process.exit(1);
});