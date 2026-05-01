-- CreateEnum
CREATE TYPE "RiskAssessmentDecision" AS ENUM ('APPROVED', 'REJECTED', 'ADJUSTED');

-- CreateTable
CREATE TABLE "RiskProfile" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "maxRiskPerTrade" DECIMAL(12,8) NOT NULL,
    "maxDailyDrawdown" DECIMAL(12,8) NOT NULL,
    "maxOpenTrades" INTEGER NOT NULL,
    "minRiskRewardRatio" DECIMAL(12,8) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RiskProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RiskAssessment" (
    "id" TEXT NOT NULL,
    "signalId" TEXT NOT NULL,
    "riskProfileId" TEXT NOT NULL,
    "positionSize" DECIMAL(24,8) NOT NULL,
    "monetaryRisk" DECIMAL(24,8) NOT NULL,
    "riskRewardRatio" DECIMAL(12,8) NOT NULL,
    "decision" "RiskAssessmentDecision" NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RiskAssessment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RiskProfile_name_key" ON "RiskProfile"("name");

-- CreateIndex
CREATE INDEX "RiskProfile_isActive_createdAt_idx" ON "RiskProfile"("isActive", "createdAt");

-- CreateIndex
CREATE INDEX "RiskAssessment_signalId_createdAt_idx" ON "RiskAssessment"("signalId", "createdAt");

-- CreateIndex
CREATE INDEX "RiskAssessment_riskProfileId_createdAt_idx" ON "RiskAssessment"("riskProfileId", "createdAt");

-- CreateIndex
CREATE INDEX "RiskAssessment_decision_createdAt_idx" ON "RiskAssessment"("decision", "createdAt");

-- AddForeignKey
ALTER TABLE "RiskAssessment" ADD CONSTRAINT "RiskAssessment_signalId_fkey" FOREIGN KEY ("signalId") REFERENCES "TradingSignal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RiskAssessment" ADD CONSTRAINT "RiskAssessment_riskProfileId_fkey" FOREIGN KEY ("riskProfileId") REFERENCES "RiskProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Seed default profile
INSERT INTO "RiskProfile" (
    "id",
    "name",
    "maxRiskPerTrade",
    "maxDailyDrawdown",
    "maxOpenTrades",
    "minRiskRewardRatio",
    "isActive"
) VALUES (
    'default-risk-profile',
    'DEFAULT_PROFILE',
    0.01000000,
    0.02000000,
    1,
    2.00000000,
    true
) ON CONFLICT ("name") DO NOTHING;
