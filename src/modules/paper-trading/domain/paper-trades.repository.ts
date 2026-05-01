import {
  PaperTradeCloseReason,
  PaperTradeResult,
  PaperTradeStatus,
  TradeDirection,
} from '@prisma/client';
import { PaperTradeEntity } from './paper-trade.entity';

export type CreatePaperTradeData = {
  accountId: string;
  signalId?: string;
  instrumentId: string;
  direction: TradeDirection;
  entryPrice: number;
  stopLoss?: number;
  takeProfit?: number;
  positionSize: number;
};

export type ClosePaperTradeData = {
  status: PaperTradeStatus;
  closedAt: Date;
  closePrice: number;
  pnl: number;
  pnlPercent: number;
  result: PaperTradeResult;
  closeReason: PaperTradeCloseReason;
};

export type FindPaperTradesQuery = {
  accountId?: string;
  instrumentId?: string;
  status?: PaperTradeStatus;
  result?: PaperTradeResult;
  from?: Date;
  to?: Date;
};

export interface PaperTradesRepository {
  create(data: CreatePaperTradeData): Promise<PaperTradeEntity>;
  findMany(query?: FindPaperTradesQuery): Promise<PaperTradeEntity[]>;
  findById(id: string): Promise<PaperTradeEntity | null>;
  findOpenByInstrument(instrumentId: string): Promise<PaperTradeEntity | null>;
  findOpenByAccount(accountId: string): Promise<PaperTradeEntity[]>;
  findBySignalId(signalId: string): Promise<PaperTradeEntity | null>;
  close(id: string, data: ClosePaperTradeData): Promise<PaperTradeEntity>;
}
