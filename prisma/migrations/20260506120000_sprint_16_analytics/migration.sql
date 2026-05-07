CREATE TYPE "AnalyticsExecutionType" AS ENUM ('BACKTEST', 'PAPER_TRADING', 'LIVE_LIMITED');

CREATE TYPE "AnalyticsPeriodType" AS ENUM ('DAILY', 'WEEKLY', 'MONTHLY');

CREATE TABLE "AnalyticsReportSnapshot" (
    "id" TEXT NOT NULL,
    "executionType" "AnalyticsExecutionType" NOT NULL,
    "periodType" "AnalyticsPeriodType" NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "metrics" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnalyticsReportSnapshot_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AnalyticsReportSnapshot_executionType_periodType_periodStart_idx" ON "AnalyticsReportSnapshot"("executionType", "periodType", "periodStart");
CREATE INDEX "AnalyticsReportSnapshot_createdAt_idx" ON "AnalyticsReportSnapshot"("createdAt");
