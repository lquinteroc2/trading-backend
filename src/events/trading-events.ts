import { RiskAssessmentDecision, Timeframe } from '@prisma/client';

export const TRADING_EVENTS = {
  CANDLE_CREATED: 'CANDLE_CREATED',
  CANDLE_CLOSED: 'CANDLE_CLOSED',
  TECHNICAL_ANALYSIS_COMPLETED: 'TECHNICAL_ANALYSIS_COMPLETED',
  SIGNAL_CREATED: 'SIGNAL_CREATED',
  SIGNAL_STATUS_UPDATED: 'SIGNAL_STATUS_UPDATED',
  RISK_APPROVED: 'RISK_APPROVED',
  RISK_EVALUATED: 'RISK_EVALUATED',
  SUPERVISOR_DECIDED: 'SUPERVISOR_DECIDED',
  PAPER_TRADE_OPENED: 'PAPER_TRADE_OPENED',
  PAPER_TRADE_CLOSED: 'PAPER_TRADE_CLOSED',
  JOB_COMPLETED: 'JOB_COMPLETED',
  JOB_FAILED: 'JOB_FAILED',
  KILL_SWITCH_CHANGED: 'KILL_SWITCH_CHANGED',
  SYSTEM_LOG_CREATED: 'SYSTEM_LOG_CREATED',
  ECONOMIC_EVENT_CREATED: 'ECONOMIC_EVENT_CREATED',
  ECONOMIC_EVENT_UPDATED: 'ECONOMIC_EVENT_UPDATED',
  ECONOMIC_EVENT_DELETED: 'ECONOMIC_EVENT_DELETED',
  FUNDAMENTAL_EVALUATED: 'FUNDAMENTAL_EVALUATED',
  FUNDAMENTAL_BLOCK: 'FUNDAMENTAL_BLOCK',
  SUPERVISOR_BLOCKED_BY_FUNDAMENTAL: 'SUPERVISOR_BLOCKED_BY_FUNDAMENTAL',
  ASSISTED_APPROVAL_REQUIRED: 'assisted.approval_required',
  ASSISTED_SIGNAL_APPROVED: 'assisted.signal_approved',
  ASSISTED_SIGNAL_REJECTED: 'assisted.signal_rejected',
  ASSISTED_EXECUTION_STARTED: 'assisted.execution_started',
  ASSISTED_EXECUTION_COMPLETED: 'assisted.execution_completed',
  ASSISTED_EXECUTION_FAILED: 'assisted.execution_failed',
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

export type SignalStatusUpdatedEvent = {
  signalId: string;
  status: string;
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

export type SupervisorDecidedEvent = {
  signalId: string;
  agentDecisionId: string;
  supervisorDecisionId: string;
  decision: string;
  reason: string;
};

export type PaperTradeOpenedEvent = {
  signalId: string;
  tradeId: string;
  instrumentId: string;
};

export type PaperTradeClosedEvent = {
  tradeId: string;
  result: string;
  pnl: number;
};

export type JobFailedEvent = {
  source: string;
  jobId?: string;
  message: string;
};

export type JobCompletedEvent = {
  source: string;
  jobId?: string;
  message: string;
  payload?: Record<string, unknown>;
};

export type KillSwitchChangedEvent = {
  killSwitch: boolean;
  mode?: string;
};

export type SystemLogCreatedEvent = {
  id: string;
  level: string;
  source: string;
  message: string;
  context: string | null;
  createdAt: Date;
};

export type EconomicEventChangedEvent = {
  id: string;
  currency: string;
  title: string;
  impact: string;
  eventTime: Date;
};

export type FundamentalEvaluatedEvent = {
  decision: string;
  currency: string;
  reason: string;
  blockingEvent: EconomicEventChangedEvent | null;
  checkedAt: Date;
};

export type FundamentalBlockEvent = {
  economicEventId: string;
  currency: string;
  impact: string;
  title: string;
};

export type SupervisorBlockedByFundamentalEvent = {
  signalId: string;
  supervisorDecisionId: string;
  economicEventId?: string;
};

export type AssistedApprovalRequiredEvent = {
  signalId: string;
  supervisorDecisionId: string;
  reason: string;
};

export type AssistedSignalDecisionEvent = {
  signalId: string;
  manualDecisionId: string;
  userId: string;
  executionTarget: string;
  reason: string;
};

export type AssistedExecutionEvent = {
  signalId: string;
  manualDecisionId: string;
  executionTarget: string;
  message: string;
};
