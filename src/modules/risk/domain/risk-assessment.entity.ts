import { RiskAssessmentDecision } from '@prisma/client';

export class RiskAssessmentEntity {
  constructor(
    public readonly id: string,
    public readonly signalId: string,
    public readonly riskProfileId: string,
    public readonly positionSize: number,
    public readonly monetaryRisk: number,
    public readonly riskRewardRatio: number,
    public readonly decision: RiskAssessmentDecision,
    public readonly reason: string,
    public readonly createdAt: Date,
  ) {}
}
