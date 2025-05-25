-- CreateTable
CREATE TABLE `users`
(
    `id`        VARCHAR(191) NOT NULL,
    `email`     VARCHAR(191) NOT NULL,
    `username`  VARCHAR(191) NOT NULL,
    `password`  VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3)  NOT NULL,

    UNIQUE INDEX `users_email_key` (`email`),
    UNIQUE INDEX `users_username_key` (`username`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Todo`
(
    `id`        VARCHAR(191) NOT NULL,
    `content`   VARCHAR(191) NOT NULL,
    `completed` BOOLEAN      NOT NULL DEFAULT false,
    `important` BOOLEAN      NOT NULL DEFAULT false,
    `startDate` DATETIME(3)  NULL,
    `endDate`   DATETIME(3)  NULL,
    `createdAt` DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3)  NOT NULL,
    `userId`    VARCHAR(191) NOT NULL,

    INDEX `Todo_userId_createdAt_idx` (`userId`, `createdAt`),
    INDEX `Todo_userId_startDate_idx` (`userId`, `startDate`),
    INDEX `Todo_userId_endDate_idx` (`userId`, `endDate`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

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

-- CreateTable
CREATE TABLE `user_health_metrics`
(
    `id`                 VARCHAR(191) NOT NULL,
    `userId`             VARCHAR(191) NOT NULL,
    `recordedAt`         DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `heightCm`           DOUBLE       NULL,
    `weightKg`           DOUBLE       NULL,
    `ageAtRecording`     INTEGER      NULL,
    `gender`             VARCHAR(191) NULL,
    `activityLevel`      VARCHAR(191) NULL,
    `neckCm`             DOUBLE       NULL,
    `waistCm`            DOUBLE       NULL,
    `hipCm`              DOUBLE       NULL,
    `bmi`                DOUBLE       NULL,
    `bmr`                DOUBLE       NULL,
    `tdee`               DOUBLE       NULL,
    `bodyFatPercent`     DOUBLE       NULL,
    `recommendedWaterMl` DOUBLE       NULL,
    `notes`              TEXT         NULL,
    `createdAt`          DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt`          DATETIME(3)  NOT NULL,

    INDEX `user_health_metrics_userId_recordedAt_idx` (`userId`, `recordedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Todo`
    ADD CONSTRAINT `Todo_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `recipes`
    ADD CONSTRAINT `recipes_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_health_metrics`
    ADD CONSTRAINT `user_health_metrics_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;
