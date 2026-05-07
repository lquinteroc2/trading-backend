CREATE TYPE "BrokerConnectionStatus" AS ENUM ('SUCCESS', 'FAILED');

CREATE TYPE "BrokerAction" AS ENUM ('ACCOUNT_INFO', 'SYMBOLS', 'PRICE', 'DRY_RUN_ORDER', 'PLACE_ORDER');

CREATE TYPE "BrokerOrderSimulationStatus" AS ENUM ('VALIDATED', 'BLOCKED', 'FAILED');

CREATE TABLE "BrokerConnectionLog" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "status" "BrokerConnectionStatus" NOT NULL,
    "action" "BrokerAction" NOT NULL,
    "requestPayload" JSONB,
    "responsePayload" JSONB,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BrokerConnectionLog_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BrokerOrderSimulation" (
    "id" TEXT NOT NULL,
    "signalId" TEXT,
    "supervisorDecisionId" TEXT,
    "provider" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "direction" "TradeDirection" NOT NULL,
    "volume" DECIMAL(24,8) NOT NULL,
    "entryPrice" DECIMAL(20,8) NOT NULL,
    "stopLoss" DECIMAL(20,8),
    "takeProfit" DECIMAL(20,8),
    "status" "BrokerOrderSimulationStatus" NOT NULL,
    "dryRun" BOOLEAN NOT NULL DEFAULT true,
    "reason" TEXT NOT NULL,
    "requestPayload" JSONB NOT NULL,
    "responsePayload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BrokerOrderSimulation_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "BrokerConnectionLog_provider_action_createdAt_idx" ON "BrokerConnectionLog"("provider", "action", "createdAt");
CREATE INDEX "BrokerConnectionLog_status_createdAt_idx" ON "BrokerConnectionLog"("status", "createdAt");
CREATE INDEX "BrokerOrderSimulation_signalId_createdAt_idx" ON "BrokerOrderSimulation"("signalId", "createdAt");
CREATE INDEX "BrokerOrderSimulation_provider_symbol_createdAt_idx" ON "BrokerOrderSimulation"("provider", "symbol", "createdAt");
CREATE INDEX "BrokerOrderSimulation_status_createdAt_idx" ON "BrokerOrderSimulation"("status", "createdAt");

ALTER TABLE "BrokerOrderSimulation" ADD CONSTRAINT "BrokerOrderSimulation_signalId_fkey" FOREIGN KEY ("signalId") REFERENCES "TradingSignal"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "BrokerOrderSimulation" ADD CONSTRAINT "BrokerOrderSimulation_supervisorDecisionId_fkey" FOREIGN KEY ("supervisorDecisionId") REFERENCES "SupervisorDecision"("id") ON DELETE SET NULL ON UPDATE CASCADE;
