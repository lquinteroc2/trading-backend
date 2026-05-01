import { RiskProfileEntity } from './risk-profile.entity';

export type CreateRiskProfileData = {
  id?: string;
  name: string;
  maxRiskPerTrade: number;
  maxDailyDrawdown: number;
  maxOpenTrades: number;
  minRiskRewardRatio: number;
  isActive?: boolean;
};

export interface RiskProfilesRepository {
  findActive(): Promise<RiskProfileEntity | null>;
  findById(id: string): Promise<RiskProfileEntity | null>;
  upsertDefault(data: CreateRiskProfileData): Promise<RiskProfileEntity>;
}
