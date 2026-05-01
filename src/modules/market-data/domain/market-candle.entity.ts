import { Timeframe } from '@prisma/client';

export class MarketCandleEntity {
  constructor(
    public readonly id: string,
    public readonly instrumentId: string,
    public readonly timeframe: Timeframe,
    public readonly open: number,
    public readonly high: number,
    public readonly low: number,
    public readonly close: number,
    public readonly volume: number,
    public readonly timestamp: Date,
    public readonly source: string,
    public readonly createdAt: Date,
  ) {}
}
