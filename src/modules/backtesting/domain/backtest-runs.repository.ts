import { BacktestStatus, BacktestTradeResult, Timeframe, TradeDirection } from '@prisma/client';
import { BacktestRunEntity } from './backtest-run.entity';
import { BacktestTradeEntity } from './backtest-trade.entity';

export type CreateBacktestRunData = {
  strategyId: string;
  strategyVersionId?: string | null;
  instrumentId: string;
  timeframe: Timeframe;
  startDate: Date;
  endDate: Date;
  initialBalance: number;
};

export type BacktestMetricsData = {
  finalBalance: number;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  grossProfit: number;
  grossLoss: number;
  profitFactor: number | null;
  maxDrawdown: number;
  netPnL: number;
  averageWin: number | null;
  averageLoss: number | null;
};

export type CreateBacktestTradeData = {
  backtestRunId: string;
  signalId?: string | null;
  direction: TradeDirection;
  entryPrice: number;
  stopLoss: number;
  takeProfit: number;
  positionSize: number;
  openedAt: Date;
  closedAt?: Date | null;
  exitPrice?: number | null;
  pnl?: number | null;
  pnlPercent?: number | null;
  result?: BacktestTradeResult | null;
};

export type FindBacktestRunsQuery = {
  instrumentId?: string;
  strategyId?: string;
  status?: BacktestStatus;
  limit?: number;
};

export interface BacktestRunsRepository {
  createRun(data: CreateBacktestRunData): Promise<BacktestRunEntity>;
  completeRun(id: string, metrics: BacktestMetricsData): Promise<BacktestRunEntity>;
  failRun(id: string, errorMessage: string): Promise<BacktestRunEntity>;
  findRuns(query: FindBacktestRunsQuery): Promise<BacktestRunEntity[]>;
  findRunById(id: string): Promise<BacktestRunEntity | null>;
  createTrades(data: CreateBacktestTradeData[]): Promise<{ count: number }>;
  findTradesByRunId(backtestRunId: string): Promise<BacktestTradeEntity[]>;
}
