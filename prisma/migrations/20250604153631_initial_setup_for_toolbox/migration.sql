-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "failedLoginAttempts" INTEGER DEFAULT 0,
    "lastFailedLoginAt" TIMESTAMP(3),
    "isLocked" BOOLEAN DEFAULT false,
    "lockoutExpiresAt" TIMESTAMP(3),
    "lastLoginAt" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vocabulary_words" (
    "id" TEXT NOT NULL,
    "english" TEXT NOT NULL,
    "chinese" TEXT NOT NULL,
    "phonetic_us" TEXT,
    "phonetic_uk" TEXT,
    "tags" JSONB,
    "source" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vocabulary_words_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_word_progress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "vocabularyWordId" TEXT NOT NULL,
    "isMemorized" BOOLEAN NOT NULL DEFAULT false,
    "lastReviewedAt" TIMESTAMP(3),
    "nextReviewAt" TIMESTAMP(3),
    "familiarity" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_word_progress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "todos" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT '无标题待办',
    "content" TEXT,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "important" BOOLEAN NOT NULL DEFAULT false,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "image" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "todos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recipes" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "ingredients" TEXT NOT NULL,
    "instructions" TEXT NOT NULL,
    "category" TEXT,
    "prepTime" TEXT,
    "cookTime" TEXT,
    "isFavorite" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "recipes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_health_metrics" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "heightCm" DOUBLE PRECISION,
    "weightKg" DOUBLE PRECISION,
    "ageAtRecording" INTEGER,
    "gender" TEXT,
    "activityLevel" TEXT,
    "neckCm" DOUBLE PRECISION,
    "waistCm" DOUBLE PRECISION,
    "hipCm" DOUBLE PRECISION,
    "bmi" DOUBLE PRECISION,
    "bmr" DOUBLE PRECISION,
    "tdee" DOUBLE PRECISION,
    "bodyFatPercent" DOUBLE PRECISION,
    "recommendedWaterMl" DOUBLE PRECISION,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_health_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_chat_sessions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT DEFAULT '新的聊天',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_chat_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_chat_messages" (
    "id" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sessionId" TEXT NOT NULL,

    CONSTRAINT "ai_chat_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exchange_rates" (
    "id" TEXT NOT NULL,
    "baseCurrency" TEXT NOT NULL,
    "targetCurrency" TEXT NOT NULL,
    "rate" DOUBLE PRECISION NOT NULL,
    "name" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "source" TEXT,

    CONSTRAINT "exchange_rates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_exchange_queries" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fromCurrency" TEXT NOT NULL,
    "toCurrency" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "result" DOUBLE PRECISION NOT NULL,
    "rate" DOUBLE PRECISION NOT NULL,
    "queriedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_exchange_queries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_global_2048_experiences" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "initialBoardStateJson" TEXT NOT NULL,
    "finalBoardStateJson" TEXT NOT NULL,
    "moveSequenceJson" TEXT NOT NULL,
    "scoreAchieved" INTEGER NOT NULL,
    "highestTile" INTEGER NOT NULL,
    "numberOfMoves" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,

    CONSTRAINT "ai_global_2048_experiences_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "vocabulary_words_english_key" ON "vocabulary_words"("english");

-- CreateIndex
CREATE INDEX "vocabulary_words_english_idx" ON "vocabulary_words"("english");

-- CreateIndex
CREATE INDEX "vocabulary_words_source_idx" ON "vocabulary_words"("source");

-- CreateIndex
CREATE INDEX "user_word_progress_userId_isMemorized_idx" ON "user_word_progress"("userId", "isMemorized");

-- CreateIndex
CREATE INDEX "user_word_progress_userId_nextReviewAt_idx" ON "user_word_progress"("userId", "nextReviewAt");

-- CreateIndex
CREATE UNIQUE INDEX "user_word_progress_userId_vocabularyWordId_key" ON "user_word_progress"("userId", "vocabularyWordId");

-- CreateIndex
CREATE INDEX "todos_userId_createdAt_idx" ON "todos"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "todos_userId_completed_endDate_idx" ON "todos"("userId", "completed", "endDate");

-- CreateIndex
CREATE INDEX "todos_userId_important_createdAt_idx" ON "todos"("userId", "important", "createdAt");

-- CreateIndex
CREATE INDEX "recipes_userId_category_idx" ON "recipes"("userId", "category");

-- CreateIndex
CREATE INDEX "recipes_userId_isFavorite_idx" ON "recipes"("userId", "isFavorite");

-- CreateIndex
CREATE INDEX "user_health_metrics_userId_recordedAt_idx" ON "user_health_metrics"("userId", "recordedAt");

-- CreateIndex
CREATE INDEX "ai_chat_sessions_userId_updatedAt_idx" ON "ai_chat_sessions"("userId", "updatedAt" DESC);

-- CreateIndex
CREATE INDEX "ai_chat_messages_sessionId_createdAt_idx" ON "ai_chat_messages"("sessionId", "createdAt");

-- CreateIndex
CREATE INDEX "exchange_rates_baseCurrency_idx" ON "exchange_rates"("baseCurrency");

-- CreateIndex
CREATE INDEX "exchange_rates_targetCurrency_idx" ON "exchange_rates"("targetCurrency");

-- CreateIndex
CREATE INDEX "exchange_rates_updatedAt_idx" ON "exchange_rates"("updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "exchange_rates_baseCurrency_targetCurrency_key" ON "exchange_rates"("baseCurrency", "targetCurrency");

-- CreateIndex
CREATE INDEX "user_exchange_queries_userId_queriedAt_idx" ON "user_exchange_queries"("userId", "queriedAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "ai_global_2048_experiences_gameId_key" ON "ai_global_2048_experiences"("gameId");

-- CreateIndex
CREATE INDEX "ai_global_2048_experiences_scoreAchieved_highestTile_create_idx" ON "ai_global_2048_experiences"("scoreAchieved", "highestTile", "createdAt" DESC);

-- AddForeignKey
ALTER TABLE "user_word_progress" ADD CONSTRAINT "user_word_progress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_word_progress" ADD CONSTRAINT "user_word_progress_vocabularyWordId_fkey" FOREIGN KEY ("vocabularyWordId") REFERENCES "vocabulary_words"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "todos" ADD CONSTRAINT "todos_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recipes" ADD CONSTRAINT "recipes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_health_metrics" ADD CONSTRAINT "user_health_metrics_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_chat_sessions" ADD CONSTRAINT "ai_chat_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_chat_messages" ADD CONSTRAINT "ai_chat_messages_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "ai_chat_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_exchange_queries" ADD CONSTRAINT "user_exchange_queries_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
