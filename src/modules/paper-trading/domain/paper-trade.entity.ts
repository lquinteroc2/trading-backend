import {
  PaperTradeCloseReason,
  PaperTradeResult,
  PaperTradeStatus,
  TradeDirection,
} from '@prisma/client';

export class PaperTradeEntity {
  constructor(
    public readonly id: string,
    public readonly accountId: string,
    public readonly signalId: string | null,
    public readonly instrumentId: string,
    public readonly direction: TradeDirection,
    public readonly entryPrice: number,
    public readonly stopLoss: number | null,
    public readonly takeProfit: number | null,
    public readonly positionSize: number,
    public readonly status: PaperTradeStatus,
    public readonly openedAt: Date,
    public readonly closedAt: Date | null,
    public readonly closePrice: number | null,
    public readonly pnl: number | null,
    public readonly pnlPercent: number | null,
    public readonly result: PaperTradeResult,
    public readonly closeReason: PaperTradeCloseReason | null,
  ) {}
}
