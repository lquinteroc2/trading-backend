import { Injectable } from '@nestjs/common';
import { Prisma, RiskAssessmentDecision } from '@prisma/client';
import { PrismaService } from '@/database/prisma.service';
import { RiskAssessmentEntity } from '../domain/risk-assessment.entity';
import {
  CreateRiskAssessmentData,
  RiskAssessmentsRepository,
} from '../domain/risk-assessments.repository';

@Injectable()
export class PrismaRiskAssessmentsRepository implements RiskAssessmentsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateRiskAssessmentData): Promise<RiskAssessmentEntity> {
    const assessment = await this.prisma.riskAssessment.create({ data });
    return this.toEntity(assessment);
  }

  async findMany(): Promise<RiskAssessmentEntity[]> {
    const assessments = await this.prisma.riskAssessment.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return assessments.map((assessment) => this.toEntity(assessment));
  }

  private toEntity(assessment: {
    id: string;
    signalId: string;
    riskProfileId: string;
    positionSize: Prisma.Decimal;
    monetaryRisk: Prisma.Decimal;
    riskRewardRatio: Prisma.Decimal;
    decision: RiskAssessmentDecision;
    reason: string;
    createdAt: Date;
  }) {
    return new RiskAssessmentEntity(
      assessment.id,
      assessment.signalId,
      assessment.riskProfileId,
      assessment.positionSize.toNumber(),
      assessment.monetaryRisk.toNumber(),
      assessment.riskRewardRatio.toNumber(),
      assessment.decision,
      assessment.reason,
      assessment.createdAt,
    );
  }
}
