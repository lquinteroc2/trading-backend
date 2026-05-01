import { Timeframe } from '@prisma/client';

export type FetchHistoricalCandlesParams = {
  symbol: string;
  timeframe: Timeframe;
  startTime: Date;
  endTime?: Date;
  limit?: number;
};

export type NormalizedCandle = {
  symbol: string;
  timeframe: Timeframe;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  timestamp: Date;
  source: string;
  raw?: unknown;
};

export interface MarketDataProvider {
  getName(): string;
  supportsSymbol(symbol: string): boolean;
  fetchHistoricalCandles(params: FetchHistoricalCandlesParams): Promise<NormalizedCandle[]>;
}
