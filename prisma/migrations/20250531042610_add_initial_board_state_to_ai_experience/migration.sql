-- CreateTable
CREATE TABLE `ai_global_2048_experiences`
(
    `id`                    VARCHAR(191) NOT NULL,
    `gameId`                VARCHAR(191) NOT NULL,
    `initialBoardStateJson` TEXT         NOT NULL,
    `finalBoardStateJson`   TEXT         NOT NULL,
    `moveSequenceJson`      TEXT         NOT NULL,
    `scoreAchieved`         INTEGER      NOT NULL,
    `highestTile`           INTEGER      NOT NULL,
    `numberOfMoves`         INTEGER      NOT NULL,
    `createdAt`             DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `notes`                 VARCHAR(191) NULL,

    INDEX `ai_global_2048_experiences_scoreAchieved_highestTile_created_idx` (`scoreAchieved`, `highestTile`, `createdAt` DESC),
    INDEX `ai_global_2048_experiences_gameId_idx` (`gameId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;
