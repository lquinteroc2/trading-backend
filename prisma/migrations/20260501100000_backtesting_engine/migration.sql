-- CreateEnum
CREATE TYPE "BacktestStatus" AS ENUM ('RUNNING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "BacktestTradeResult" AS ENUM ('WIN', 'LOSS', 'BREAKEVEN');

-- CreateTable
CREATE TABLE "BacktestRun" (
    "id" TEXT NOT NULL,
    "strategyId" TEXT NOT NULL,
    "strategyVersionId" TEXT,
    "instrumentId" TEXT NOT NULL,
    "timeframe" "Timeframe" NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "initialBalance" DECIMAL(24,8) NOT NULL,
    "finalBalance" DECIMAL(24,8),
    "totalTrades" INTEGER NOT NULL DEFAULT 0,
    "winningTrades" INTEGER NOT NULL DEFAULT 0,
    "losingTrades" INTEGER NOT NULL DEFAULT 0,
    "winRate" DECIMAL(12,8),
    "grossProfit" DECIMAL(24,8) NOT NULL DEFAULT 0,
    "grossLoss" DECIMAL(24,8) NOT NULL DEFAULT 0,
    "profitFactor" DECIMAL(20,8),
    "maxDrawdown" DECIMAL(12,8),
    "netPnL" DECIMAL(24,8) NOT NULL DEFAULT 0,
    "averageWin" DECIMAL(24,8),
    "averageLoss" DECIMAL(24,8),
    "status" "BacktestStatus" NOT NULL DEFAULT 'RUNNING',
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),

    CONSTRAINT "BacktestRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BacktestTrade" (
    "id" TEXT NOT NULL,
    "backtestRunId" TEXT NOT NULL,
    "signalId" TEXT,
    "direction" "TradeDirection" NOT NULL,
    "entryPrice" DECIMAL(20,8) NOT NULL,
    "stopLoss" DECIMAL(20,8) NOT NULL,
    "takeProfit" DECIMAL(20,8) NOT NULL,
    "positionSize" DECIMAL(24,8) NOT NULL,
    "openedAt" TIMESTAMP(3) NOT NULL,
    "closedAt" TIMESTAMP(3),
    "exitPrice" DECIMAL(20,8),
    "pnl" DECIMAL(24,8),
    "pnlPercent" DECIMAL(12,8),
    "result" "BacktestTradeResult",

    CONSTRAINT "BacktestTrade_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BacktestRun_instrumentId_timeframe_createdAt_idx" ON "BacktestRun"("instrumentId", "timeframe", "createdAt");

-- CreateIndex
CREATE INDEX "BacktestRun_strategyId_createdAt_idx" ON "BacktestRun"("strategyId", "createdAt");

-- CreateIndex
CREATE INDEX "BacktestRun_status_createdAt_idx" ON "BacktestRun"("status", "createdAt");

-- CreateIndex
CREATE INDEX "BacktestTrade_backtestRunId_openedAt_idx" ON "BacktestTrade"("backtestRunId", "openedAt");

-- CreateIndex
CREATE INDEX "BacktestTrade_signalId_idx" ON "BacktestTrade"("signalId");

-- AddForeignKey
ALTER TABLE "BacktestRun" ADD CONSTRAINT "BacktestRun_strategyId_fkey" FOREIGN KEY ("strategyId") REFERENCES "Strategy"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BacktestRun" ADD CONSTRAINT "BacktestRun_strategyVersionId_fkey" FOREIGN KEY ("strategyVersionId") REFERENCES "StrategyVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BacktestRun" ADD CONSTRAINT "BacktestRun_instrumentId_fkey" FOREIGN KEY ("instrumentId") REFERENCES "Instrument"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BacktestTrade" ADD CONSTRAINT "BacktestTrade_backtestRunId_fkey" FOREIGN KEY ("backtestRunId") REFERENCES "BacktestRun"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
