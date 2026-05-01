import { BacktestTradeResult, TradeDirection } from '@prisma/client';

export class BacktestTradeEntity {
  constructor(
    public readonly id: string,
    public readonly backtestRunId: string,
    public readonly signalId: string | null,
    public readonly direction: TradeDirection,
    public readonly entryPrice: number,
    public readonly stopLoss: number,
    public readonly takeProfit: number,
    public readonly positionSize: number,
    public readonly openedAt: Date,
    public readonly closedAt: Date | null,
    public readonly exitPrice: number | null,
    public readonly pnl: number | null,
    public readonly pnlPercent: number | null,
    public readonly result: BacktestTradeResult | null,
  ) {}
}
