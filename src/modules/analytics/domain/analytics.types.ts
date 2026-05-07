import { AnalyticsExecutionType, Timeframe, TradeDirection } from '@prisma/client';

export type AnalyticsGroupBy = 'DAY' | 'WEEK' | 'STRATEGY' | 'SYMBOL' | 'TIMEFRAME';

export type AnalyticsFilters = {
  executionType?: AnalyticsExecutionType;
  instrumentId?: string;
  symbol?: string;
  strategyId?: string;
  timeframe?: Timeframe;
  from?: Date;
  to?: Date;
  groupBy?: AnalyticsGroupBy;
};

export type AnalyticsTrade = {
  id: string;
  executionType: AnalyticsExecutionType;
  instrumentId?: string | null;
  symbol?: string | null;
  strategyId?: string | null;
  timeframe?: Timeframe | null;
  direction: TradeDirection;
  entryPrice: number;
  exitPrice?: number | null;
  positionSize: number;
  pnl: number;
  riskRewardRatio?: number | null;
  openedAt: Date;
  closedAt?: Date | null;
};

export type EquityCurvePoint = {
  date: string;
  balance: number;
  equity: number;
  pnl: number;
};

export type TradingMetrics = {
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  breakevenTrades: number;
  winRate: number;
  lossRate: number;
  profitFactor: number;
  grossProfit: number;
  grossLoss: number;
  netPnL: number;
  averageWin: number;
  averageLoss: number;
  expectancy: number;
  maxDrawdown: number;
  averageRiskReward: number;
  bestTrade: number;
  worstTrade: number;
};

export type GroupedTradingMetrics = {
  key: string;
  metrics: TradingMetrics;
};

export interface TradeAnalyticsSource {
  getTrades(filters: AnalyticsFilters): Promise<AnalyticsTrade[]>;
  getEquityCurve(filters: AnalyticsFilters): Promise<EquityCurvePoint[]>;
}
