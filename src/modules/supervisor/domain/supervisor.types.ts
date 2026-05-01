import { RiskAssessmentDecision, SignalDirection, SystemMode } from '@prisma/client';

export type SupervisorSignalInput = {
  id: string;
  instrumentId: string;
  direction: SignalDirection;
  confidenceScore: number;
  entryPrice: number;
  stopLoss: number | null;
  takeProfit: number | null;
};

export type SupervisorRiskInput = {
  id: string;
  decision: RiskAssessmentDecision;
  positionSize: number;
  riskRewardRatio: number;
};

export type SupervisorAccountState = {
  balance: number;
  equity: number;
  openTrades: number;
  dailyPnL: number;
  hasOpenTradeForInstrument: boolean;
};

export type SupervisorSystemConfig = {
  mode: SystemMode;
  killSwitch: boolean;
};
