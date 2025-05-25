-- CreateTable
CREATE TABLE `ai_chat_sessions`
(
    `id`        VARCHAR(191) NOT NULL,
    `userId`    VARCHAR(191) NOT NULL,
    `title`     VARCHAR(191) NULL,
    `createdAt` DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3)  NOT NULL,

    INDEX `ai_chat_sessions_userId_updatedAt_idx` (`userId`, `updatedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ai_chat_messages`
(
    `id`        VARCHAR(191) NOT NULL,
    `role`      VARCHAR(191) NOT NULL,
    `content`   TEXT         NOT NULL,
    `createdAt` DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `sessionId` VARCHAR(191) NOT NULL,
    `userId`    VARCHAR(191) NULL,

    INDEX `ai_chat_messages_sessionId_createdAt_idx` (`sessionId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `ai_chat_sessions`
    ADD CONSTRAINT `ai_chat_sessions_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ai_chat_messages`
    ADD CONSTRAINT `ai_chat_messages_sessionId_fkey` FOREIGN KEY (`sessionId`) REFERENCES `ai_chat_sessions` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ai_chat_messages`
    ADD CONSTRAINT `ai_chat_messages_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;
