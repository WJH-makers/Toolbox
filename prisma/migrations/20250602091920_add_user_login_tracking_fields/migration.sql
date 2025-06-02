-- CreateTable
CREATE TABLE `users` (
    `id` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `username` VARCHAR(191) NOT NULL,
    `password` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `failedLoginAttempts` INTEGER NULL DEFAULT 0,
    `lastFailedLoginAt` DATETIME(3) NULL,
    `isLocked` BOOLEAN NULL DEFAULT false,
    `lockoutExpiresAt` DATETIME(3) NULL,
    `lastLoginAt` DATETIME(3) NULL,

    UNIQUE INDEX `users_email_key`(`email`),
    UNIQUE INDEX `users_username_key`(`username`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `vocabulary_words` (
    `id` VARCHAR(191) NOT NULL,
    `english` VARCHAR(191) NOT NULL,
    `chinese` TEXT NOT NULL,
    `phonetic_us` VARCHAR(191) NULL,
    `phonetic_uk` VARCHAR(191) NULL,
    `tags` JSON NULL,
    `source` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `vocabulary_words_english_key`(`english`),
    INDEX `vocabulary_words_english_idx`(`english`),
    INDEX `vocabulary_words_source_idx`(`source`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user_word_progress` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `vocabularyWordId` VARCHAR(191) NOT NULL,
    `isMemorized` BOOLEAN NOT NULL DEFAULT false,
    `lastReviewedAt` DATETIME(3) NULL,
    `nextReviewAt` DATETIME(3) NULL,
    `familiarity` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `user_word_progress_userId_isMemorized_idx`(`userId`, `isMemorized`),
    INDEX `user_word_progress_userId_nextReviewAt_idx`(`userId`, `nextReviewAt`),
    UNIQUE INDEX `user_word_progress_userId_vocabularyWordId_key`(`userId`, `vocabularyWordId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `todos` (
    `id` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL DEFAULT '无标题待办',
    `content` TEXT NULL,
    `completed` BOOLEAN NOT NULL DEFAULT false,
    `important` BOOLEAN NOT NULL DEFAULT false,
    `startDate` DATETIME(3) NULL,
    `endDate` DATETIME(3) NULL,
    `image` MEDIUMTEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,

    INDEX `todos_userId_createdAt_idx`(`userId`, `createdAt`),
    INDEX `todos_userId_completed_endDate_idx`(`userId`, `completed`, `endDate`),
    INDEX `todos_userId_important_createdAt_idx`(`userId`, `important`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `recipes` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `ingredients` TEXT NOT NULL,
    `instructions` TEXT NOT NULL,
    `category` VARCHAR(191) NULL,
    `prepTime` VARCHAR(191) NULL,
    `cookTime` VARCHAR(191) NULL,
    `isFavorite` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,

    INDEX `recipes_userId_category_idx`(`userId`, `category`),
    INDEX `recipes_userId_isFavorite_idx`(`userId`, `isFavorite`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user_health_metrics` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `recordedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `heightCm` DOUBLE NULL,
    `weightKg` DOUBLE NULL,
    `ageAtRecording` INTEGER NULL,
    `gender` VARCHAR(191) NULL,
    `activityLevel` VARCHAR(191) NULL,
    `neckCm` DOUBLE NULL,
    `waistCm` DOUBLE NULL,
    `hipCm` DOUBLE NULL,
    `bmi` DOUBLE NULL,
    `bmr` DOUBLE NULL,
    `tdee` DOUBLE NULL,
    `bodyFatPercent` DOUBLE NULL,
    `recommendedWaterMl` DOUBLE NULL,
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `user_health_metrics_userId_recordedAt_idx`(`userId`, `recordedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ai_chat_sessions` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NULL DEFAULT '新的聊天',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `ai_chat_sessions_userId_updatedAt_idx`(`userId`, `updatedAt` DESC),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ai_chat_messages` (
    `id` VARCHAR(191) NOT NULL,
    `role` VARCHAR(191) NOT NULL,
    `content` TEXT NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `sessionId` VARCHAR(191) NOT NULL,

    INDEX `ai_chat_messages_sessionId_createdAt_idx`(`sessionId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `exchange_rates` (
    `id` VARCHAR(191) NOT NULL,
    `baseCurrency` VARCHAR(191) NOT NULL,
    `targetCurrency` VARCHAR(191) NOT NULL,
    `rate` DOUBLE NOT NULL,
    `name` VARCHAR(191) NULL,
    `updatedAt` DATETIME(3) NOT NULL,
    `source` VARCHAR(191) NULL,

    INDEX `exchange_rates_baseCurrency_idx`(`baseCurrency`),
    INDEX `exchange_rates_targetCurrency_idx`(`targetCurrency`),
    INDEX `exchange_rates_updatedAt_idx`(`updatedAt`),
    UNIQUE INDEX `exchange_rates_baseCurrency_targetCurrency_key`(`baseCurrency`, `targetCurrency`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user_exchange_queries` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `fromCurrency` VARCHAR(191) NOT NULL,
    `toCurrency` VARCHAR(191) NOT NULL,
    `amount` DOUBLE NOT NULL,
    `result` DOUBLE NOT NULL,
    `rate` DOUBLE NOT NULL,
    `queriedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `user_exchange_queries_userId_queriedAt_idx`(`userId`, `queriedAt` DESC),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ai_global_2048_experiences` (
    `id` VARCHAR(191) NOT NULL,
    `gameId` VARCHAR(191) NOT NULL,
    `initialBoardStateJson` TEXT NOT NULL,
    `finalBoardStateJson` TEXT NOT NULL,
    `moveSequenceJson` TEXT NOT NULL,
    `scoreAchieved` INTEGER NOT NULL,
    `highestTile` INTEGER NOT NULL,
    `numberOfMoves` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `notes` TEXT NULL,

    UNIQUE INDEX `ai_global_2048_experiences_gameId_key`(`gameId`),
    INDEX `ai_global_2048_experiences_scoreAchieved_highestTile_created_idx`(`scoreAchieved`, `highestTile`, `createdAt` DESC),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `user_word_progress` ADD CONSTRAINT `user_word_progress_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_word_progress` ADD CONSTRAINT `user_word_progress_vocabularyWordId_fkey` FOREIGN KEY (`vocabularyWordId`) REFERENCES `vocabulary_words`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `todos` ADD CONSTRAINT `todos_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `recipes` ADD CONSTRAINT `recipes_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_health_metrics` ADD CONSTRAINT `user_health_metrics_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ai_chat_sessions` ADD CONSTRAINT `ai_chat_sessions_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ai_chat_messages` ADD CONSTRAINT `ai_chat_messages_sessionId_fkey` FOREIGN KEY (`sessionId`) REFERENCES `ai_chat_sessions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_exchange_queries` ADD CONSTRAINT `user_exchange_queries_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
