-- CreateEnum
CREATE TYPE "SupervisorDecisionAction" AS ENUM ('OPERATE', 'WAIT', 'BLOCK');

-- CreateEnum
CREATE TYPE "SystemMode" AS ENUM ('PAPER_TRADING', 'SAFE_MODE', 'PAUSED');

-- CreateTable
CREATE TABLE "SupervisorDecision" (
    "id" TEXT NOT NULL,
    "signalId" TEXT NOT NULL,
    "decision" "SupervisorDecisionAction" NOT NULL,
    "reason" TEXT NOT NULL,
    "confidenceScore" INTEGER NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SupervisorDecision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SystemConfig" (
    "id" TEXT NOT NULL,
    "mode" "SystemMode" NOT NULL DEFAULT 'PAPER_TRADING',
    "killSwitch" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SystemConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SupervisorDecision_signalId_key" ON "SupervisorDecision"("signalId");

-- CreateIndex
CREATE INDEX "SupervisorDecision_decision_createdAt_idx" ON "SupervisorDecision"("decision", "createdAt");

-- AddForeignKey
ALTER TABLE "SupervisorDecision" ADD CONSTRAINT "SupervisorDecision_signalId_fkey" FOREIGN KEY ("signalId") REFERENCES "TradingSignal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
