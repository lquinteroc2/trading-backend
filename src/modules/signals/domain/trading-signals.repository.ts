import { SignalDirection, SignalStatus, SourceAgent, Timeframe } from '@prisma/client';
import { TradingSignalEntity } from './trading-signal.entity';

export type CreateTradingSignalData = {
  instrumentId: string;
  strategyId?: string;
  timeframe?: Timeframe;
  direction: SignalDirection;
  entryPrice: number;
  stopLoss?: number;
  takeProfit?: number;
  confidenceScore: number;
  status?: SignalStatus;
  sourceAgent: SourceAgent;
  candleTimestamp?: Date;
  reason?: string;
  reasoning?: string;
  expiresAt?: Date;
};

export type FindSignalsQuery = {
  instrumentId?: string;
  timeframe?: Timeframe;
  status?: SignalStatus;
  from?: Date;
  to?: Date;
  limit?: number;
};

export type SignalCandleKey = {
  instrumentId: string;
  timeframe: Timeframe;
  candleTimestamp: Date;
};

export interface TradingSignalsRepository {
  create(data: CreateTradingSignalData): Promise<TradingSignalEntity>;
  findMany(query: FindSignalsQuery): Promise<TradingSignalEntity[]>;
  findById(id: string): Promise<TradingSignalEntity | null>;
  findByCandleKey(key: SignalCandleKey): Promise<TradingSignalEntity | null>;
  updateStatus(id: string, status: SignalStatus): Promise<TradingSignalEntity>;
}
