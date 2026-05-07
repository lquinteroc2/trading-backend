import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { TOKENS } from '@/shared/tokens';
import { RiskProfileEntity } from '@/modules/risk/domain/risk-profile.entity';
import { RiskProfilesRepository } from '@/modules/risk/domain/risk-profiles.repository';
import { UpdateActiveRiskProfileDto } from '../presentation/dto/update-active-risk-profile.dto';

@Injectable()
export class RiskProfileDashboardService {
  constructor(
    @Inject(TOKENS.RISK_PROFILES_REPOSITORY)
    private readonly riskProfilesRepository: RiskProfilesRepository,
  ) {}

  async getActive() {
    const profile = await this.riskProfilesRepository.findActive();
    if (!profile) {
      throw new NotFoundException('Active risk profile not found');
    }
    return this.toResponse(profile);
  }

  async updateActive(dto: UpdateActiveRiskProfileDto) {
    const profile = await this.riskProfilesRepository.updateActive({
      name: dto.name,
      maxRiskPerTrade:
        dto.maxRiskPerTradePercent === undefined ? undefined : dto.maxRiskPerTradePercent / 100,
      maxDailyDrawdown:
        dto.maxDailyDrawdownPercent === undefined ? undefined : dto.maxDailyDrawdownPercent / 100,
      maxOpenTrades: dto.maxOpenTrades,
      minRiskRewardRatio: dto.minRiskRewardRatio,
    });
    if (!profile) {
      throw new NotFoundException('Active risk profile not found');
    }
    return this.toResponse(profile);
  }

  private toResponse(profile: RiskProfileEntity) {
    return {
      id: profile.id,
      name: profile.name,
      maxRiskPerTradePercent: this.round(profile.maxRiskPerTrade * 100),
      minRiskRewardRatio: this.round(profile.minRiskRewardRatio),
      maxDailyDrawdownPercent: this.round(profile.maxDailyDrawdown * 100),
      maxOpenTrades: profile.maxOpenTrades,
      isActive: profile.isActive,
      createdAt: profile.createdAt,
      updatedAt: profile.updatedAt,
    };
  }

  private round(value: number) {
    return Math.round(value * 100) / 100;
  }
}
