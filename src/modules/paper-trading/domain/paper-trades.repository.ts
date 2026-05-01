import { PaperTradeResult, PaperTradeStatus, TradeDirection } from '@prisma/client';
import { PaperTradeEntity } from './paper-trade.entity';

export type CreatePaperTradeData = {
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
};

export interface PaperTradesRepository {
  create(data: CreatePaperTradeData): Promise<PaperTradeEntity>;
  findMany(): Promise<PaperTradeEntity[]>;
  findById(id: string): Promise<PaperTradeEntity | null>;
  close(id: string, data: ClosePaperTradeData): Promise<PaperTradeEntity>;
}
