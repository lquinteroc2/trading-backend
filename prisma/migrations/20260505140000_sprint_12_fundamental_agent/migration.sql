CREATE TYPE "EconomicImpact" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

CREATE TABLE "EconomicEvent" (
    "id" TEXT NOT NULL,
    "currency" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "impact" "EconomicImpact" NOT NULL,
    "eventTime" TIMESTAMP(3) NOT NULL,
    "source" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EconomicEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "EconomicEvent_currency_impact_eventTime_idx" ON "EconomicEvent"("currency", "impact", "eventTime");
CREATE INDEX "EconomicEvent_eventTime_idx" ON "EconomicEvent"("eventTime");
