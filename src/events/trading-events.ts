import { RiskAssessmentDecision, Timeframe } from '@prisma/client';

export const TRADING_EVENTS = {
  CANDLE_CREATED: 'CANDLE_CREATED',
  CANDLE_CLOSED: 'CANDLE_CLOSED',
  TECHNICAL_ANALYSIS_COMPLETED: 'TECHNICAL_ANALYSIS_COMPLETED',
  SIGNAL_CREATED: 'SIGNAL_CREATED',
  RISK_APPROVED: 'RISK_APPROVED',
  RISK_EVALUATED: 'RISK_EVALUATED',
} as const;

export type CandleClosedEvent = {
  candleId?: string;
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

export type SignalCreatedEvent = {
  signalId: string;
  instrumentId: string;
  timeframe: Timeframe | null;
};

export type RiskApprovedEvent = {
  signalId: string;
  instrumentId: string;
  agentDecisionId: string;
};

export type RiskEvaluatedEvent = RiskApprovedEvent & {
  assessmentId: string;
  decision: RiskAssessmentDecision;
};
