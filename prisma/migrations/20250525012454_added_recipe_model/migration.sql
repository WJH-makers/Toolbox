-- CreateTable
CREATE TABLE `recipes`
(
    `id`           VARCHAR(191) NOT NULL,
    `name`         VARCHAR(191) NOT NULL,
    `ingredients`  TEXT         NOT NULL,
    `instructions` TEXT         NOT NULL,
    `category`     VARCHAR(191) NULL,
    `prepTime`     VARCHAR(191) NULL,
    `cookTime`     VARCHAR(191) NULL,
    `isFavorite`   BOOLEAN      NOT NULL DEFAULT false,
    `createdAt`    DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt`    DATETIME(3)  NOT NULL,
    `userId`       VARCHAR(191) NOT NULL,

    INDEX `recipes_userId_createdAt_idx` (`userId`, `createdAt`),
    INDEX `recipes_userId_isFavorite_idx` (`userId`, `isFavorite`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `recipes`
    ADD CONSTRAINT `recipes_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;
