import { Timeframe } from '@prisma/client';

export type TechnicalAnalysisExecutionSource = 'QUEUE' | 'MANUAL';

export type TechnicalAnalysisJobPayload = {
  instrumentId: string;
  symbol: string;
  timeframe: Timeframe;
  candleTimestamp?: string;
  limit?: number;
  executionSource: TechnicalAnalysisExecutionSource;
};
