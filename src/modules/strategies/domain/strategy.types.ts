import { SignalDirection, Timeframe } from '@prisma/client';
import { AgentDecisionEntity } from '@/modules/agents/domain/agent-decision.entity';
import { MarketCandleEntity } from '@/modules/market-data/domain/market-candle.entity';
import { StrategyEntity } from './strategy.entity';

export type TechnicalIndicators = {
  ema20?: number;
  ema50?: number;
  ema200?: number;
  rsi14?: number;
  atr14?: number;
};

export type StrategyContext = {
  instrumentId: string;
  symbol: string;
  timeframe: Timeframe;
  technicalAnalysis: AgentDecisionEntity;
  latestCandle: MarketCandleEntity;
  candles?: MarketCandleEntity[];
};

export type StrategyResult = {
  strategyId: string;
  strategyName: string;
  direction: SignalDirection;
  entryPrice: number;
  stopLoss?: number;
  takeProfit?: number;
  confidence: number;
  reason: string;
  shouldCreateSignal: boolean;
};

export interface IStrategy {
  readonly name: string;
  evaluate(context: StrategyContext, strategy: StrategyEntity): StrategyResult;
}
