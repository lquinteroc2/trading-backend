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

export type SupportResistanceLevel = {
  price: number;
  touches: number;
  strength: 'WEAK' | 'MEDIUM' | 'STRONG' | string;
};

export type SupportResistanceAnalysis = {
  supports: SupportResistanceLevel[];
  resistances: SupportResistanceLevel[];
  nearestSupport?: number | null;
  nearestResistance?: number | null;
};

export type MarketRegimeAnalysis = {
  regime: 'TRENDING' | 'RANGING' | 'HIGH_VOLATILITY' | 'LOW_VOLATILITY' | string;
  isRanging: boolean;
  volatilityState: 'LOW' | 'NORMAL' | 'HIGH' | string;
  atrPercent: number;
  reason: string;
};

export type MultiTimeframeAnalysis = {
  primary: Timeframe;
  confirmationTimeframes: Timeframe[];
  alignment: 'ALIGNED' | 'CONFLICTED' | 'PARTIAL' | string;
  biasByTimeframe: Partial<Record<Timeframe, 'BULLISH' | 'BEARISH' | 'NEUTRAL'>>;
};

export type TechnicalAnalysisResult = {
  symbol: string;
  timeframe: Timeframe;
  primaryTimeframe?: Timeframe;
  candlesAnalyzed: number;
  trend: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  technicalBias: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  confidenceScore: number;
  indicators: TechnicalAnalysisIndicators;
  supportResistance?: SupportResistanceAnalysis;
  marketRegime?: MarketRegimeAnalysis;
  multiTimeframe?: MultiTimeframeAnalysis;
  reasoning: string[];
  warnings: string[];
};

export type AnalyzeCandlesParams = {
  symbol: string;
  timeframe: Timeframe;
  primaryTimeframe?: Timeframe;
  candles: TechnicalAnalysisCandle[];
  timeframes?: Partial<Record<Timeframe, TechnicalAnalysisCandle[]>>;
};

export interface TechnicalAnalysisProvider {
  analyzeCandles(params: AnalyzeCandlesParams): Promise<TechnicalAnalysisResult>;
}
