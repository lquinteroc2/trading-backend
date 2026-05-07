ALTER TYPE "SignalStatus" ADD VALUE IF NOT EXISTS 'PENDING_MANUAL_APPROVAL';
ALTER TYPE "SignalStatus" ADD VALUE IF NOT EXISTS 'MANUALLY_APPROVED';
ALTER TYPE "SignalStatus" ADD VALUE IF NOT EXISTS 'MANUALLY_REJECTED';
ALTER TYPE "SignalStatus" ADD VALUE IF NOT EXISTS 'EXECUTED_PAPER';
ALTER TYPE "SignalStatus" ADD VALUE IF NOT EXISTS 'DRY_RUN_EXECUTED';

ALTER TYPE "SystemMode" ADD VALUE IF NOT EXISTS 'RESEARCH';
ALTER TYPE "SystemMode" ADD VALUE IF NOT EXISTS 'BACKTESTING';
ALTER TYPE "SystemMode" ADD VALUE IF NOT EXISTS 'ASSISTED_TRADING';

CREATE TYPE "ManualTradingDecisionAction" AS ENUM ('APPROVE', 'REJECT');

CREATE TYPE "ManualExecutionTarget" AS ENUM ('PAPER_TRADING', 'MT5_DRY_RUN', 'NONE');

CREATE TABLE "ManualTradingDecision" (
    "id" TEXT NOT NULL,
    "signalId" TEXT NOT NULL,
    "supervisorDecisionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "decision" "ManualTradingDecisionAction" NOT NULL,
    "executionTarget" "ManualExecutionTarget" NOT NULL DEFAULT 'NONE',
    "reason" TEXT NOT NULL,
    "metadata" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ManualTradingDecision_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ManualTradingDecision_signalId_createdAt_idx" ON "ManualTradingDecision"("signalId", "createdAt");
CREATE INDEX "ManualTradingDecision_userId_createdAt_idx" ON "ManualTradingDecision"("userId", "createdAt");
CREATE INDEX "ManualTradingDecision_decision_executionTarget_createdAt_idx" ON "ManualTradingDecision"("decision", "executionTarget", "createdAt");

ALTER TABLE "ManualTradingDecision" ADD CONSTRAINT "ManualTradingDecision_signalId_fkey" FOREIGN KEY ("signalId") REFERENCES "TradingSignal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ManualTradingDecision" ADD CONSTRAINT "ManualTradingDecision_supervisorDecisionId_fkey" FOREIGN KEY ("supervisorDecisionId") REFERENCES "SupervisorDecision"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ManualTradingDecision" ADD CONSTRAINT "ManualTradingDecision_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
