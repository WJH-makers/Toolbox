// server/api/vocabulary/session.get.js
import {createError, defineEventHandler, getQuery} from 'h3';
import {PrismaClient} from '@prisma/client';

const prisma = new PrismaClient();

export default defineEventHandler(async (event) => {
    const queryForDemo = getQuery(event);
    const userId = queryForDemo.userId_DEMO_ONLY;

    if (!userId) {
        throw createError({statusCode: 401, statusMessage: '用户未认证'});
    }
    const listSource = (queryForDemo.source || 'common').toLowerCase(); // 例如: common, cet4, my-custom-list
    try {
        // 步骤 1: 获取指定来源的所有单词ID
        const allWordsInSource = await prisma.vocabularyWord.findMany({
            where: {
                source: listSource, // 假设 VocabularyWord 有一个 'source' 字段来标识词表来源
            },
            select: {
                id: true,
            },
        });

        if (allWordsInSource.length === 0) {
            return []; // 如果该词库本身是空的
        }
        const allWordIdsInSource = allWordsInSource.map(w => w.id);

        // 步骤 2: 获取这些单词中，用户已标记为 "isMemorized = true" 的单词ID
        const memorizedUserProgress = await prisma.userWordProgress.findMany({
            where: {
                userId: userId,
                vocabularyWordId: {in: allWordIdsInSource},
                isMemorized: true,
            },
            select: {
                vocabularyWordId: true,
            },
        });
        const memorizedWordIds = new Set(memorizedUserProgress.map(p => p.vocabularyWordId));

        // 步骤 3: 从源单词列表中排除已记住的单词ID
        const wordsToLearnIds = allWordIdsInSource.filter(id => !memorizedWordIds.has(id));

        if (wordsToLearnIds.length === 0) {
            return []; // 用户已学完该列表所有单词
        }

        // 步骤 4: 获取这些未学习单词的完整信息
        // 注意：这里返回的应该是符合前端 Word 接口的结构
        const wordsForSession = await prisma.vocabularyWord.findMany({
            where: {
                id: {in: wordsToLearnIds},
            },
            select: { // 选择前端需要的字段，以匹配 `Word` 类型
                id: true,
                english: true,
                chinese: true,
                phonetic_us: true,
                phonetic_uk: true,
                example_en: true,
                example_cn: true,
                tags: true, // Prisma会自动处理JSON到数组的转换（如果schema中定义为Json）
                            // 如果schema中tags是String，这里会返回String，前端需要处理
            }
        });

        // Prisma Client 对于定义为 Json 的字段，在读取时通常会自动解析。
        // 如果 VocabularyWord.tags 在 Prisma schema 中定义为 Json，这里 wordsForSession 中的 tags 应该已经是数组了。
        // 如果是 String（例如逗号分隔），您可能需要在前端或这里进一步处理。
        // 假设您的 Word 类型期望 tags 是 string[]，并且 Prisma 返回的是 JSON 解析后的数组或已经是数组。

        return wordsForSession;

    } catch (error) {
        console.error("[API vocabulary/session.get] 获取单词列表失败:", error);
        throw createError({statusCode: 500, statusMessage: '获取单词列表失败'});
    }
});