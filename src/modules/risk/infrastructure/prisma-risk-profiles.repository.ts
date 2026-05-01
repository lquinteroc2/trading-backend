import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@/database/prisma.service';
import { RiskProfileEntity } from '../domain/risk-profile.entity';
import { CreateRiskProfileData, RiskProfilesRepository } from '../domain/risk-profiles.repository';

@Injectable()
export class PrismaRiskProfilesRepository implements RiskProfilesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findActive(): Promise<RiskProfileEntity | null> {
    const profile = await this.prisma.riskProfile.findFirst({
      where: { isActive: true },
      orderBy: { createdAt: 'asc' },
    });
    return profile ? this.toEntity(profile) : null;
  }

  async findById(id: string): Promise<RiskProfileEntity | null> {
    const profile = await this.prisma.riskProfile.findUnique({ where: { id } });
    return profile ? this.toEntity(profile) : null;
  }

  async upsertDefault(data: CreateRiskProfileData): Promise<RiskProfileEntity> {
    const profile = await this.prisma.riskProfile.upsert({
      where: { name: data.name },
      update: {
        maxRiskPerTrade: data.maxRiskPerTrade,
        maxDailyDrawdown: data.maxDailyDrawdown,
        maxOpenTrades: data.maxOpenTrades,
        minRiskRewardRatio: data.minRiskRewardRatio,
        isActive: data.isActive ?? true,
      },
      create: data,
    });
    return this.toEntity(profile);
  }

  private toEntity(profile: {
    id: string;
    name: string;
    maxRiskPerTrade: Prisma.Decimal;
    maxDailyDrawdown: Prisma.Decimal;
    maxOpenTrades: number;
    minRiskRewardRatio: Prisma.Decimal;
    isActive: boolean;
    createdAt: Date;
  }) {
    return new RiskProfileEntity(
      profile.id,
      profile.name,
      profile.maxRiskPerTrade.toNumber(),
      profile.maxDailyDrawdown.toNumber(),
      profile.maxOpenTrades,
      profile.minRiskRewardRatio.toNumber(),
      profile.isActive,
      profile.createdAt,
    );
  }
}
