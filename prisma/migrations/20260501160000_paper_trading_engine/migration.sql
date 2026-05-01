-- CreateEnum
CREATE TYPE "PaperTradingAccountStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "PaperTradeCloseReason" AS ENUM ('STOP_LOSS', 'TAKE_PROFIT', 'MANUAL', 'SYSTEM');

-- CreateTable
CREATE TABLE "PaperTradingAccount" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "initialBalance" DECIMAL(24,8) NOT NULL,
    "balance" DECIMAL(24,8) NOT NULL,
    "equity" DECIMAL(24,8) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "status" "PaperTradingAccountStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaperTradingAccount_pkey" PRIMARY KEY ("id")
);

-- Seed default account before backfilling existing paper trades.
INSERT INTO "PaperTradingAccount" ("id", "name", "initialBalance", "balance", "equity", "currency", "status", "updatedAt")
VALUES ('default-paper-account', 'DEFAULT_PAPER_ACCOUNT', 10000, 10000, 10000, 'USD', 'ACTIVE', CURRENT_TIMESTAMP)
ON CONFLICT DO NOTHING;

-- AlterTable
ALTER TABLE "PaperTrade" ADD COLUMN "accountId" TEXT;
ALTER TABLE "PaperTrade" ADD COLUMN "closeReason" "PaperTradeCloseReason";

UPDATE "PaperTrade" SET "accountId" = 'default-paper-account' WHERE "accountId" IS NULL;

ALTER TABLE "PaperTrade" ALTER COLUMN "accountId" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "PaperTradingAccount_name_key" ON "PaperTradingAccount"("name");

-- CreateIndex
CREATE INDEX "PaperTradingAccount_status_createdAt_idx" ON "PaperTradingAccount"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "PaperTrade_signalId_key" ON "PaperTrade"("signalId");

-- CreateIndex
CREATE INDEX "PaperTrade_accountId_status_openedAt_idx" ON "PaperTrade"("accountId", "status", "openedAt");

-- AddForeignKey
ALTER TABLE "PaperTrade" ADD CONSTRAINT "PaperTrade_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "PaperTradingAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
