import { Timeframe } from '@prisma/client';

export const TRADING_EVENTS = {
  CANDLE_CREATED: 'CANDLE_CREATED',
  CANDLE_CLOSED: 'CANDLE_CLOSED',
  TECHNICAL_ANALYSIS_COMPLETED: 'TECHNICAL_ANALYSIS_COMPLETED',
} as const;

export type CandleClosedEvent = {
  instrumentId: string;
  timeframe: Timeframe;
  candleTimestamp: Date;
  source: 'REALTIME' | 'MANUAL' | 'SYNC';
  triggerAnalysis: boolean;
};

export type TechnicalAnalysisCompletedEvent = {
  agentDecisionId: string;
  instrumentId: string;
  timeframe: Timeframe;
  symbol: string;
};
