import { Timeframe } from '@prisma/client';
import { MarketCandleEntity } from './market-candle.entity';

export type CreateMarketCandleData = {
  instrumentId: string;
  timeframe: Timeframe;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  timestamp: Date;
  source: string;
};

export type FindCandlesQuery = {
  instrumentId?: string;
  timeframe?: Timeframe;
  from?: Date;
  to?: Date;
};

export interface MarketCandlesRepository {
  create(data: CreateMarketCandleData): Promise<MarketCandleEntity>;
  createMany(data: CreateMarketCandleData[]): Promise<{ count: number }>;
  findMany(query: FindCandlesQuery): Promise<MarketCandleEntity[]>;
}
