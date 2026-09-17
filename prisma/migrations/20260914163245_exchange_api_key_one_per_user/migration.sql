/*
  Warnings:

  - A unique constraint covering the columns `[userId]` on the table `ExchangeApiKey` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "ExchangeApiKey_userId_exchangeTypeId_key";

-- CreateIndex
CREATE UNIQUE INDEX "ExchangeApiKey_userId_key" ON "ExchangeApiKey"("userId");
