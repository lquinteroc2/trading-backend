-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "StrategyStatus" AS ENUM ('ACTIVE', 'INACTIVE');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- AlterEnum
ALTER TYPE "SignalDirection" ADD VALUE IF NOT EXISTS 'NONE';

-- AlterEnum
ALTER TYPE "SignalStatus" ADD VALUE IF NOT EXISTS 'CREATED';
ALTER TYPE "SignalStatus" ADD VALUE IF NOT EXISTS 'UNDER_REVIEW';

-- AlterTable
ALTER TABLE "TradingSignal"
ADD COLUMN IF NOT EXISTS "strategyId" TEXT,
ADD COLUMN IF NOT EXISTS "timeframe" "Timeframe",
ADD COLUMN IF NOT EXISTS "candleTimestamp" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "reason" TEXT;

-- CreateTable
CREATE TABLE "Strategy" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" "StrategyStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Strategy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StrategyVersion" (
    "id" TEXT NOT NULL,
    "strategyId" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "parameters" JSONB NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StrategyVersion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Strategy_name_key" ON "Strategy"("name");

-- CreateIndex
CREATE UNIQUE INDEX "StrategyVersion_strategyId_version_key" ON "StrategyVersion"("strategyId", "version");

-- CreateIndex
CREATE INDEX "StrategyVersion_strategyId_isActive_idx" ON "StrategyVersion"("strategyId", "isActive");

-- CreateIndex
CREATE INDEX "TradingSignal_strategyId_createdAt_idx" ON "TradingSignal"("strategyId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "TradingSignal_instrumentId_timeframe_candleTimestamp_key" ON "TradingSignal"("instrumentId", "timeframe", "candleTimestamp");

-- AddForeignKey
ALTER TABLE "StrategyVersion" ADD CONSTRAINT "StrategyVersion_strategyId_fkey" FOREIGN KEY ("strategyId") REFERENCES "Strategy"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TradingSignal" ADD CONSTRAINT "TradingSignal_strategyId_fkey" FOREIGN KEY ("strategyId") REFERENCES "Strategy"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Seed initial strategy and active version.
INSERT INTO "Strategy" ("id", "name", "description", "status")
VALUES ('ema-trend-strategy', 'EMA_TREND_STRATEGY', 'EMA alignment strategy with RSI confirmation and ATR-based exits.', 'ACTIVE')
ON CONFLICT ("name") DO NOTHING;

INSERT INTO "StrategyVersion" ("id", "strategyId", "version", "parameters", "isActive")
VALUES (
  'ema-trend-strategy-v1',
  'ema-trend-strategy',
  'v1',
  '{"rsiBuyMin":45,"rsiBuyMax":70,"rsiSellMin":30,"rsiSellMax":55,"atrStableMaxPercentOfPrice":5,"trendConsistencyCandles":3}',
  true
)
ON CONFLICT ("strategyId", "version") DO NOTHING;
