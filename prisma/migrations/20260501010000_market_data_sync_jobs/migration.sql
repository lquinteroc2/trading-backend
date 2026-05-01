CREATE TYPE "DataSyncStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED');

CREATE TABLE "MarketDataSyncJob" (
  "id" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "instrumentId" TEXT NOT NULL,
  "symbol" TEXT NOT NULL,
  "timeframe" "Timeframe" NOT NULL,
  "startTime" TIMESTAMP(3) NOT NULL,
  "endTime" TIMESTAMP(3),
  "status" "DataSyncStatus" NOT NULL DEFAULT 'PENDING',
  "requestedLimit" INTEGER,
  "fetchedCount" INTEGER NOT NULL DEFAULT 0,
  "insertedCount" INTEGER NOT NULL DEFAULT 0,
  "skippedDuplicates" INTEGER NOT NULL DEFAULT 0,
  "errorMessage" TEXT,
  "startedAt" TIMESTAMP(3),
  "finishedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MarketDataSyncJob_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "MarketDataSyncJob_provider_status_createdAt_idx" ON "MarketDataSyncJob"("provider", "status", "createdAt");
CREATE INDEX "MarketDataSyncJob_instrumentId_timeframe_startTime_idx" ON "MarketDataSyncJob"("instrumentId", "timeframe", "startTime");

ALTER TABLE "MarketDataSyncJob" ADD CONSTRAINT "MarketDataSyncJob_instrumentId_fkey" FOREIGN KEY ("instrumentId") REFERENCES "Instrument"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
