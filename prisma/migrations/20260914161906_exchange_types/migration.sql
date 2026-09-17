/*
  Warnings:

  - You are about to drop the column `exchange` on the `ExchangeApiKey` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[userId,exchangeTypeId]` on the table `ExchangeApiKey` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `exchangeTypeId` to the `ExchangeApiKey` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "ExchangeApiKey_userId_key";

-- AlterTable
ALTER TABLE "ExchangeApiKey" DROP COLUMN "exchange",
ADD COLUMN     "exchangeTypeId" INTEGER NOT NULL,
ADD COLUMN     "xmxAssociationId" TEXT,
ALTER COLUMN "passphrase" DROP NOT NULL;

-- CreateTable
CREATE TABLE "ExchangeType" (
    "id" INTEGER NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "ExchangeType_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ExchangeType_code_key" ON "ExchangeType"("code");

-- CreateIndex
CREATE UNIQUE INDEX "ExchangeApiKey_userId_exchangeTypeId_key" ON "ExchangeApiKey"("userId", "exchangeTypeId");

-- AddForeignKey
ALTER TABLE "ExchangeApiKey" ADD CONSTRAINT "ExchangeApiKey_exchangeTypeId_fkey" FOREIGN KEY ("exchangeTypeId") REFERENCES "ExchangeType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
