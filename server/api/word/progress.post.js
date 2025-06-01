// server/api/vocabulary/progress.post.js
import {createError, defineEventHandler, readBody} from 'h3';
import {PrismaClient} from '@prisma/client';

const prisma = new PrismaClient();

export default defineEventHandler(async (event) => {
    // const userId = event.context.auth?.userId; // !!! 正确获取方式 !!!
    // 为了演示，我们暂时从 body 获取 userId，实际项目中不应这样做！
    const body = await readBody(event);
    const {userId_DEMO_ONLY: userId, wordId, known} = body; // !!! userId_DEMO_ONLY 仅为演示 !!!

    if (!userId) {
        throw createError({statusCode: 401, statusMessage: '用户未认证'});
    }
    if (!wordId || typeof known !== 'boolean') {
        throw createError({statusCode: 400, statusMessage: '缺少 wordId 或 known 参数'});
    }

    try {
        const now = new Date();
        const updatedProgress = await prisma.userWordProgress.upsert({
            where: {
                userId_vocabularyWordId: { // Prisma 会根据 @@unique([userId, vocabularyWordId]) 生成这个组合键
                    userId: userId,
                    vocabularyWordId: wordId,
                },
            },
            update: {
                isMemorized: known,
                lastReviewedAt: now,
                // 如果 known 为 true，可以清除 nextReviewAt 或根据SRS算法重新计算
                // if (known) nextReviewAt = null; else ...
            },
            create: {
                userId: userId,
                vocabularyWordId: wordId,
                isMemorized: known,
                lastReviewedAt: now,
            },
        });
        return {success: true, progress: updatedProgress};
    } catch (error) {
        console.error("[API vocabulary/progress.post] 更新单词进度失败:", error);
        // 检查是否是关联错误，例如 wordId 不存在于 VocabularyWord 表中
        if (error.code === 'P2003' || error.code === 'P2025') { // Prisma foreign key constraint failed or record not found
            throw createError({statusCode: 404, statusMessage: `单词 (ID: ${wordId}) 不存在或关联错误。`});
        }
        throw createError({statusCode: 500, statusMessage: '更新单词进度失败'});
    }
});