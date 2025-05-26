/*
  Warnings:

  - You are about to drop the column `userId` on the `ai_chat_messages` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE `ai_chat_messages`
    DROP FOREIGN KEY `ai_chat_messages_userId_fkey`;

-- DropIndex
DROP INDEX `ai_chat_messages_userId_fkey` ON `ai_chat_messages`;

-- AlterTable
ALTER TABLE `ai_chat_messages`
    DROP COLUMN `userId`;

-- CreateTable
CREATE TABLE `exchange_rates`
(
    `id`             VARCHAR(191) NOT NULL,
    `baseCurrency`   VARCHAR(191) NOT NULL,
    `targetCurrency` VARCHAR(191) NOT NULL,
    `rate`           DOUBLE       NOT NULL,
    `name`           VARCHAR(191) NULL,
    `updatedAt`      DATETIME(3)  NOT NULL,
    `source`         VARCHAR(191) NULL,

    INDEX `exchange_rates_baseCurrency_idx` (`baseCurrency`),
    INDEX `exchange_rates_updatedAt_idx` (`updatedAt`),
    UNIQUE INDEX `exchange_rates_baseCurrency_targetCurrency_key` (`baseCurrency`, `targetCurrency`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user_exchange_queries`
(
    `id`           VARCHAR(191) NOT NULL,
    `userId`       VARCHAR(191) NOT NULL,
    `fromCurrency` VARCHAR(191) NOT NULL,
    `toCurrency`   VARCHAR(191) NOT NULL,
    `amount`       DOUBLE       NOT NULL,
    `result`       DOUBLE       NOT NULL,
    `rate`         DOUBLE       NOT NULL,
    `queriedAt`    DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `user_exchange_queries_userId_queriedAt_idx` (`userId`, `queriedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `user_exchange_queries`
    ADD CONSTRAINT `user_exchange_queries_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;
