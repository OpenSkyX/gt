-- CreateEnum
CREATE TYPE "AvatarType" AS ENUM ('AUTO', 'UPLOAD');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('DEPOSIT', 'WITHDRAW', 'TRANSFER_IN', 'TRANSFER_OUT', 'REBATE', 'ACTIVATION');

-- CreateEnum
CREATE TYPE "TransactionStatus" AS ENUM ('PROCESSING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "RiskLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "QuantRunStatus" AS ENUM ('RUNNING', 'STOPPED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "userName" TEXT NOT NULL,
    "avatarType" "AvatarType" NOT NULL DEFAULT 'AUTO',
    "avatarImage" TEXT,
    "avatarText" TEXT NOT NULL DEFAULT 'GT',
    "avatarColor" TEXT NOT NULL DEFAULT 'from-cyan-500 to-blue-600',
    "fundPassword" TEXT,
    "inviteCode" TEXT NOT NULL,
    "invitedById" TEXT,
    "fundingBalance" DECIMAL(20,8) NOT NULL DEFAULT 0,
    "pointsBalance" DECIMAL(20,8) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExchangeApiKey" (
    "id" TEXT NOT NULL,
    "exchange" TEXT NOT NULL DEFAULT 'gate.io',
    "apiKey" TEXT NOT NULL,
    "apiSecret" TEXT NOT NULL,
    "passphrase" TEXT NOT NULL,
    "isValid" BOOLEAN NOT NULL DEFAULT false,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExchangeApiKey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Transaction" (
    "id" TEXT NOT NULL,
    "type" "TransactionType" NOT NULL,
    "status" "TransactionStatus" NOT NULL DEFAULT 'PROCESSING',
    "amount" DECIMAL(20,8) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USDT',
    "address" TEXT,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuantStrategy" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "icon" TEXT NOT NULL,
    "iconBg" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "features" TEXT[],
    "expectedReturn" TEXT NOT NULL,
    "riskLevel" "RiskLevel" NOT NULL,
    "minInvestment" DECIMAL(20,8) NOT NULL,
    "badge" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QuantStrategy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuantRun" (
    "id" TEXT NOT NULL,
    "status" "QuantRunStatus" NOT NULL DEFAULT 'RUNNING',
    "maxDrawdown" INTEGER NOT NULL,
    "initialFunds" DECIMAL(20,8) NOT NULL,
    "currentFunds" DECIMAL(20,8) NOT NULL,
    "userId" TEXT NOT NULL,
    "strategyId" TEXT NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endTime" TIMESTAMP(3),

    CONSTRAINT "QuantRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActivationReward" (
    "id" TEXT NOT NULL,
    "amount" DECIMAL(20,8) NOT NULL,
    "inviterId" TEXT NOT NULL,
    "inviteeId" TEXT NOT NULL,
    "activatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActivationReward_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommissionRecord" (
    "id" TEXT NOT NULL,
    "tradingVolume" DECIMAL(20,8) NOT NULL,
    "commission" DECIMAL(20,8) NOT NULL,
    "commissionRate" DECIMAL(6,4) NOT NULL,
    "inviterId" TEXT NOT NULL,
    "inviteeId" TEXT NOT NULL,
    "tradedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommissionRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "User_inviteCode_key" ON "User"("inviteCode");

-- CreateIndex
CREATE UNIQUE INDEX "ExchangeApiKey_userId_key" ON "ExchangeApiKey"("userId");

-- CreateIndex
CREATE INDEX "Transaction_userId_idx" ON "Transaction"("userId");

-- CreateIndex
CREATE INDEX "QuantRun_userId_idx" ON "QuantRun"("userId");

-- CreateIndex
CREATE INDEX "QuantRun_strategyId_idx" ON "QuantRun"("strategyId");

-- CreateIndex
CREATE INDEX "ActivationReward_inviterId_idx" ON "ActivationReward"("inviterId");

-- CreateIndex
CREATE INDEX "CommissionRecord_inviterId_idx" ON "CommissionRecord"("inviterId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_invitedById_fkey" FOREIGN KEY ("invitedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExchangeApiKey" ADD CONSTRAINT "ExchangeApiKey_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuantRun" ADD CONSTRAINT "QuantRun_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuantRun" ADD CONSTRAINT "QuantRun_strategyId_fkey" FOREIGN KEY ("strategyId") REFERENCES "QuantStrategy"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivationReward" ADD CONSTRAINT "ActivationReward_inviterId_fkey" FOREIGN KEY ("inviterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivationReward" ADD CONSTRAINT "ActivationReward_inviteeId_fkey" FOREIGN KEY ("inviteeId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommissionRecord" ADD CONSTRAINT "CommissionRecord_inviterId_fkey" FOREIGN KEY ("inviterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommissionRecord" ADD CONSTRAINT "CommissionRecord_inviteeId_fkey" FOREIGN KEY ("inviteeId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
