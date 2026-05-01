import { RiskAssessmentDecision } from '@prisma/client';
import { RiskAssessmentEntity } from './risk-assessment.entity';

export type CreateRiskAssessmentData = {
  signalId: string;
  riskProfileId: string;
  positionSize: number;
  monetaryRisk: number;
  riskRewardRatio: number;
  decision: RiskAssessmentDecision;
  reason: string;
};

export interface RiskAssessmentsRepository {
  create(data: CreateRiskAssessmentData): Promise<RiskAssessmentEntity>;
  findMany(): Promise<RiskAssessmentEntity[]>;
}
