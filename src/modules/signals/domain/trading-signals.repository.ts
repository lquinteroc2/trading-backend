import { SignalDirection, SignalStatus, SourceAgent } from '@prisma/client';
import { TradingSignalEntity } from './trading-signal.entity';

export type CreateTradingSignalData = {
  instrumentId: string;
  direction: SignalDirection;
  entryPrice: number;
  stopLoss?: number;
  takeProfit?: number;
  confidenceScore: number;
  sourceAgent: SourceAgent;
  reasoning?: string;
  expiresAt?: Date;
};

export type FindSignalsQuery = {
  instrumentId?: string;
  status?: SignalStatus;
};

export interface TradingSignalsRepository {
  create(data: CreateTradingSignalData): Promise<TradingSignalEntity>;
  findMany(query: FindSignalsQuery): Promise<TradingSignalEntity[]>;
  findById(id: string): Promise<TradingSignalEntity | null>;
  updateStatus(id: string, status: SignalStatus): Promise<TradingSignalEntity>;
}
