import { Timeframe } from '@prisma/client';

export type TechnicalAnalysisCandle = {
  timestamp: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

export type TechnicalAnalysisIndicators = {
  ema20: number;
  ema50: number;
  ema200: number;
  rsi14: number;
  atr14: number;
};

export type TechnicalAnalysisResult = {
  symbol: string;
  timeframe: Timeframe;
  candlesAnalyzed: number;
  trend: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  technicalBias: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  confidenceScore: number;
  indicators: TechnicalAnalysisIndicators;
  reasoning: string[];
  warnings: string[];
};

export type AnalyzeCandlesParams = {
  symbol: string;
  timeframe: Timeframe;
  candles: TechnicalAnalysisCandle[];
};

export interface TechnicalAnalysisProvider {
  analyzeCandles(params: AnalyzeCandlesParams): Promise<TechnicalAnalysisResult>;
}
