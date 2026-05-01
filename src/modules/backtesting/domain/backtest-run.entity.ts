import { BacktestStatus, Timeframe } from '@prisma/client';

export class BacktestRunEntity {
  constructor(
    public readonly id: string,
    public readonly strategyId: string,
    public readonly strategyVersionId: string | null,
    public readonly instrumentId: string,
    public readonly timeframe: Timeframe,
    public readonly startDate: Date,
    public readonly endDate: Date,
    public readonly initialBalance: number,
    public readonly finalBalance: number | null,
    public readonly totalTrades: number,
    public readonly winningTrades: number,
    public readonly losingTrades: number,
    public readonly winRate: number | null,
    public readonly grossProfit: number,
    public readonly grossLoss: number,
    public readonly profitFactor: number | null,
    public readonly maxDrawdown: number | null,
    public readonly netPnL: number,
    public readonly averageWin: number | null,
    public readonly averageLoss: number | null,
    public readonly status: BacktestStatus,
    public readonly errorMessage: string | null,
    public readonly createdAt: Date,
    public readonly finishedAt: Date | null,
  ) {}
}
