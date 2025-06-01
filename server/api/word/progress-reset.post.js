// server/api/vocabulary/progress-reset.post.js
import {createError, defineEventHandler, readBody} from 'h3';
import {PrismaClient} from '@prisma/client';

const prisma = new PrismaClient();

export default defineEventHandler(async (event) => {
    // const userId = event.context.auth?.userId; // !!! 正确获取方式 !!!
    // 为了演示，我们暂时从 body 获取 userId，实际项目中不应这样做！
    const body = await readBody(event);
    const {userId_DEMO_ONLY: userId, listSource_DEMO_ONLY: listSource} = body; // !!! userId_DEMO_ONLY 仅为演示 !!!

    if (!userId) {
        throw createError({statusCode: 401, statusMessage: '用户未认证'});
    }

    try {
        let whereClause = {userId: userId};

        if (listSource) {
            // 如果提供了 listSource，则只重置该来源的单词进度
            // 这需要 VocabularyWord 表有 'source' 字段，并且 UserWordProgress 能间接关联到它
            // 或者，如果 UserWordProgress 直接存储了 source (不推荐，数据冗余)
            // 更常见的是，重置所有或不按 source 重置。
            // 如果要按 source 重置，需要先查询该 source 下的所有 VocabularyWord ID
            const wordsInSource = await prisma.vocabularyWord.findMany({
                where: {source: listSource},
                select: {id: true}
            });
            const wordIdsInSource = wordsInSource.map(w => w.id);

            if (wordIdsInSource.length > 0) {
                whereClause = {
                    userId: userId,
                    vocabularyWordId: {in: wordIdsInSource}
                };
            } else {
                // 如果提供的 source 没有单词，则不执行任何操作或返回特定消息
                console.log(`[API vocabulary/progress-reset.post] 用户 ${userId} 请求重置来源 "${listSource}"，但该来源无单词。`);
                return {success: true, message: `来源 "${listSource}" 中没有单词可重置。`};
            }
        }
        // 如果没有提供 listSource，则重置该用户的所有单词进度

        const result = await prisma.userWordProgress.updateMany({
            where: whereClause,
            data: {
                isMemorized: false,
                lastReviewedAt: null,
                nextReviewAt: null,
                familiarity: null, // 或者重置为初始值
                // reviewCount: 0,
                // correctStreak: 0,
            },
        });

        return {success: true, resetCount: result.count};
    } catch (error) {
        console.error("[API vocabulary/progress-reset.post] 重置进度失败:", error);
        throw createError({statusCode: 500, statusMessage: '重置学习进度失败'});
    }
});