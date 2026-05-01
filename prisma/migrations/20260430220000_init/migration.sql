CREATE TYPE "Role" AS ENUM ('ADMIN', 'TRADER', 'VIEWER');
CREATE TYPE "MarketType" AS ENUM ('FOREX', 'CRYPTO', 'INDEX', 'COMMODITY', 'STOCK');
CREATE TYPE "Timeframe" AS ENUM ('M1', 'M5', 'M15', 'M30', 'H1', 'H4', 'D1');
CREATE TYPE "SignalDirection" AS ENUM ('BUY', 'SELL', 'NEUTRAL');
CREATE TYPE "SignalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'EXECUTED', 'EXPIRED');
CREATE TYPE "SourceAgent" AS ENUM ('TECHNICAL', 'FUNDAMENTAL', 'RISK', 'SUPERVISOR', 'MANUAL');
CREATE TYPE "AgentType" AS ENUM ('TECHNICAL', 'FUNDAMENTAL', 'RISK', 'EXECUTION', 'SUPERVISOR');
CREATE TYPE "AgentDecisionAction" AS ENUM ('APPROVE', 'REJECT', 'WAIT', 'MODIFY');
CREATE TYPE "TradeDirection" AS ENUM ('BUY', 'SELL');
CREATE TYPE "PaperTradeStatus" AS ENUM ('OPEN', 'CLOSED', 'CANCELLED');
CREATE TYPE "PaperTradeResult" AS ENUM ('WIN', 'LOSS', 'BREAKEVEN', 'OPEN');

CREATE TABLE "User" (
  "id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "passwordHash" TEXT NOT NULL,
  "role" "Role" NOT NULL DEFAULT 'TRADER',
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Instrument" (
  "id" TEXT NOT NULL,
  "symbol" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "marketType" "MarketType" NOT NULL,
  "brokerSymbol" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Instrument_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MarketCandle" (
  "id" TEXT NOT NULL,
  "instrumentId" TEXT NOT NULL,
  "timeframe" "Timeframe" NOT NULL,
  "open" DECIMAL(20,8) NOT NULL,
  "high" DECIMAL(20,8) NOT NULL,
  "low" DECIMAL(20,8) NOT NULL,
  "close" DECIMAL(20,8) NOT NULL,
  "volume" DECIMAL(24,8) NOT NULL,
  "timestamp" TIMESTAMP(3) NOT NULL,
  "source" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MarketCandle_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TradingSignal" (
  "id" TEXT NOT NULL,
  "instrumentId" TEXT NOT NULL,
  "direction" "SignalDirection" NOT NULL,
  "entryPrice" DECIMAL(20,8) NOT NULL,
  "stopLoss" DECIMAL(20,8),
  "takeProfit" DECIMAL(20,8),
  "confidenceScore" INTEGER NOT NULL,
  "status" "SignalStatus" NOT NULL DEFAULT 'PENDING',
  "sourceAgent" "SourceAgent" NOT NULL,
  "reasoning" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3),
  CONSTRAINT "TradingSignal_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AgentDecision" (
  "id" TEXT NOT NULL,
  "agentType" "AgentType" NOT NULL,
  "instrumentId" TEXT NOT NULL,
  "signalId" TEXT,
  "decision" "AgentDecisionAction" NOT NULL,
  "confidenceScore" INTEGER NOT NULL,
  "reasoning" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AgentDecision_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PaperTrade" (
  "id" TEXT NOT NULL,
  "signalId" TEXT,
  "instrumentId" TEXT NOT NULL,
  "direction" "TradeDirection" NOT NULL,
  "entryPrice" DECIMAL(20,8) NOT NULL,
  "stopLoss" DECIMAL(20,8),
  "takeProfit" DECIMAL(20,8),
  "positionSize" DECIMAL(24,8) NOT NULL,
  "status" "PaperTradeStatus" NOT NULL DEFAULT 'OPEN',
  "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "closedAt" TIMESTAMP(3),
  "closePrice" DECIMAL(20,8),
  "pnl" DECIMAL(24,8),
  "pnlPercent" DECIMAL(12,6),
  "result" "PaperTradeResult" NOT NULL DEFAULT 'OPEN',
  CONSTRAINT "PaperTrade_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "Instrument_symbol_key" ON "Instrument"("symbol");
CREATE INDEX "Instrument_marketType_isActive_idx" ON "Instrument"("marketType", "isActive");
CREATE UNIQUE INDEX "MarketCandle_instrumentId_timeframe_timestamp_key" ON "MarketCandle"("instrumentId", "timeframe", "timestamp");
CREATE INDEX "MarketCandle_instrumentId_timeframe_timestamp_idx" ON "MarketCandle"("instrumentId", "timeframe", "timestamp");
CREATE INDEX "TradingSignal_instrumentId_status_createdAt_idx" ON "TradingSignal"("instrumentId", "status", "createdAt");
CREATE INDEX "AgentDecision_agentType_createdAt_idx" ON "AgentDecision"("agentType", "createdAt");
CREATE INDEX "AgentDecision_instrumentId_signalId_idx" ON "AgentDecision"("instrumentId", "signalId");
CREATE INDEX "PaperTrade_instrumentId_status_openedAt_idx" ON "PaperTrade"("instrumentId", "status", "openedAt");

ALTER TABLE "MarketCandle" ADD CONSTRAINT "MarketCandle_instrumentId_fkey" FOREIGN KEY ("instrumentId") REFERENCES "Instrument"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TradingSignal" ADD CONSTRAINT "TradingSignal_instrumentId_fkey" FOREIGN KEY ("instrumentId") REFERENCES "Instrument"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AgentDecision" ADD CONSTRAINT "AgentDecision_instrumentId_fkey" FOREIGN KEY ("instrumentId") REFERENCES "Instrument"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AgentDecision" ADD CONSTRAINT "AgentDecision_signalId_fkey" FOREIGN KEY ("signalId") REFERENCES "TradingSignal"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PaperTrade" ADD CONSTRAINT "PaperTrade_signalId_fkey" FOREIGN KEY ("signalId") REFERENCES "TradingSignal"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PaperTrade" ADD CONSTRAINT "PaperTrade_instrumentId_fkey" FOREIGN KEY ("instrumentId") REFERENCES "Instrument"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
