-- AlterTable
ALTER TABLE "Todo" ADD COLUMN "dueDate" DATETIME;

-- CreateIndex
CREATE INDEX "Todo_userId_dueDate_idx" ON "Todo"("userId", "dueDate");
