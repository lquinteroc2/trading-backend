ALTER TYPE "SignalStatus" ADD VALUE IF NOT EXISTS 'LIVE_EXECUTED';

ALTER TYPE "SystemMode" ADD VALUE IF NOT EXISTS 'LIVE_LIMITED';

CREATE TYPE "LiveTradeStatus" AS ENUM ('REQUESTED', 'EXECUTED', 'REJECTED', 'FAILED', 'CLOSED');

CREATE TYPE "LiveExecutionAction" AS ENUM ('VALIDATION', 'PLACE_ORDER', 'BROKER_RESPONSE', 'BLOCKED', 'FAILED');

CREATE TYPE "LiveExecutionStatus" AS ENUM ('SUCCESS', 'FAILED', 'BLOCKED');

CREATE TABLE "LiveTrade" (
    "id" TEXT NOT NULL,
    "signalId" TEXT NOT NULL,
    "manualDecisionId" TEXT NOT NULL,
    "brokerProvider" TEXT NOT NULL,
    "brokerOrderId" TEXT,
    "symbol" TEXT NOT NULL,
    "direction" "TradeDirection" NOT NULL,
    "volume" DECIMAL(24,8) NOT NULL,
    "entryPrice" DECIMAL(20,8) NOT NULL,
    "stopLoss" DECIMAL(20,8),
    "takeProfit" DECIMAL(20,8),
    "status" "LiveTradeStatus" NOT NULL,
    "requestPayload" JSONB NOT NULL,
    "responsePayload" JSONB,
    "errorMessage" TEXT,
    "openedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LiveTrade_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LiveExecutionLog" (
    "id" TEXT NOT NULL,
    "signalId" TEXT,
    "userId" TEXT,
    "action" "LiveExecutionAction" NOT NULL,
    "status" "LiveExecutionStatus" NOT NULL,
    "reason" TEXT NOT NULL,
    "payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LiveExecutionLog_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LiveTradingLimits" (
    "id" TEXT NOT NULL,
    "maxDailyLiveTrades" INTEGER NOT NULL DEFAULT 1,
    "maxDailyLoss" DECIMAL(24,8) NOT NULL DEFAULT 50,
    "maxVolumePerTrade" DECIMAL(24,8) NOT NULL DEFAULT 0.01,
    "allowedSymbols" JSONB NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LiveTradingLimits_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "LiveTrade_signalId_createdAt_idx" ON "LiveTrade"("signalId", "createdAt");
CREATE INDEX "LiveTrade_symbol_status_createdAt_idx" ON "LiveTrade"("symbol", "status", "createdAt");
CREATE INDEX "LiveTrade_manualDecisionId_idx" ON "LiveTrade"("manualDecisionId");
CREATE INDEX "LiveExecutionLog_signalId_createdAt_idx" ON "LiveExecutionLog"("signalId", "createdAt");
CREATE INDEX "LiveExecutionLog_userId_createdAt_idx" ON "LiveExecutionLog"("userId", "createdAt");
CREATE INDEX "LiveExecutionLog_action_status_createdAt_idx" ON "LiveExecutionLog"("action", "status", "createdAt");

ALTER TABLE "LiveTrade" ADD CONSTRAINT "LiveTrade_signalId_fkey" FOREIGN KEY ("signalId") REFERENCES "TradingSignal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "LiveTrade" ADD CONSTRAINT "LiveTrade_manualDecisionId_fkey" FOREIGN KEY ("manualDecisionId") REFERENCES "ManualTradingDecision"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "LiveExecutionLog" ADD CONSTRAINT "LiveExecutionLog_signalId_fkey" FOREIGN KEY ("signalId") REFERENCES "TradingSignal"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "LiveExecutionLog" ADD CONSTRAINT "LiveExecutionLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

INSERT INTO "LiveTradingLimits" (
    "id",
    "maxDailyLiveTrades",
    "maxDailyLoss",
    "maxVolumePerTrade",
    "allowedSymbols",
    "updatedAt"
) VALUES (
    'global',
    1,
    50,
    0.01,
    '["XAUUSD","BTCUSDT"]'::jsonb,
    CURRENT_TIMESTAMP
) ON CONFLICT ("id") DO NOTHING;
