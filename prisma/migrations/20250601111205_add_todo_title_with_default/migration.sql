-- AlterTable
ALTER TABLE `todo`
    ADD COLUMN `title` VARCHAR(191) NOT NULL DEFAULT '无标题待办',
    MODIFY `content` TEXT NULL;

-- CreateIndex
CREATE INDEX `Todo_userId_title_idx` ON `Todo` (`userId`, `title`);
