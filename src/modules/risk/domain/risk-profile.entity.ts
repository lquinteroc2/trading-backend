export class RiskProfileEntity {
  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly maxRiskPerTrade: number,
    public readonly maxDailyDrawdown: number,
    public readonly maxOpenTrades: number,
    public readonly minRiskRewardRatio: number,
    public readonly isActive: boolean,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
  ) {}
}
