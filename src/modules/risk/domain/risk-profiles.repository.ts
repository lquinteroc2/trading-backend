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

export type UpdateRiskProfileData = Partial<
  Pick<
    CreateRiskProfileData,
    'name' | 'maxRiskPerTrade' | 'maxDailyDrawdown' | 'maxOpenTrades' | 'minRiskRewardRatio'
  >
>;

export interface RiskProfilesRepository {
  findActive(): Promise<RiskProfileEntity | null>;
  findById(id: string): Promise<RiskProfileEntity | null>;
  upsertDefault(data: CreateRiskProfileData): Promise<RiskProfileEntity>;
  updateActive(data: UpdateRiskProfileData): Promise<RiskProfileEntity | null>;
}
