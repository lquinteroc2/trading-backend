import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SignalDirection } from '@prisma/client';
import { IStrategy, StrategyContext, StrategyResult, TechnicalIndicators } from '../domain/strategy.types';
import { StrategyEntity } from '../domain/strategy.entity';

type EmaTrendParameters = {
  rsiBuyMin?: number;
  rsiBuyMax?: number;
  rsiSellMin?: number;
  rsiSellMax?: number;
  atrStableMaxPercentOfPrice?: number;
  trendConsistencyCandles?: number;
};

@Injectable()
export class EmaTrendStrategyService implements IStrategy {
  readonly name = 'EMA_TREND_STRATEGY';

  constructor(private readonly config: ConfigService) {}

  evaluate(context: StrategyContext, strategy: StrategyEntity): StrategyResult {
    const indicators = this.readIndicators(context.technicalAnalysis.metadata);
    const missing = this.missingIndicators(indicators);
    if (missing.length > 0) {
      return this.noSignal(strategy, context.latestCandle.close, `Missing indicators: ${missing.join(', ')}`);
    }

    const params = this.readParameters(strategy);
    const entryPrice = context.latestCandle.close;
    const bullishAlignment = indicators.ema20! > indicators.ema50! && indicators.ema50! > indicators.ema200!;
    const bearishAlignment = indicators.ema20! < indicators.ema50! && indicators.ema50! < indicators.ema200!;
    const rsiConfirmsBuy = this.between(indicators.rsi14!, params.rsiBuyMin ?? 45, params.rsiBuyMax ?? 70);
    const rsiConfirmsSell = this.between(indicators.rsi14!, params.rsiSellMin ?? 30, params.rsiSellMax ?? 55);
    const atrStable = (indicators.atr14! / entryPrice) * 100 <= (params.atrStableMaxPercentOfPrice ?? 5);
    const bullishCandles = this.isConsistentTrend(context, 'BUY', params.trendConsistencyCandles ?? 3);
    const bearishCandles = this.isConsistentTrend(context, 'SELL', params.trendConsistencyCandles ?? 3);
    const slMultiplier = this.config.get<number>('signals.atrStopLossMultiplier') ?? 1.5;
    const tpMultiplier = this.config.get<number>('signals.atrTakeProfitMultiplier') ?? 3;

    if (bullishAlignment && rsiConfirmsBuy) {
      const confidence = this.calculateConfidence({
        emaAligned: true,
        rsiConfirms: true,
        atrStable,
        candleTrendConfirms: bullishCandles,
      });
      return {
        strategyId: strategy.id,
        strategyName: strategy.name,
        direction: SignalDirection.BUY,
        entryPrice,
        stopLoss: this.roundPrice(entryPrice - indicators.atr14! * slMultiplier),
        takeProfit: this.roundPrice(entryPrice + indicators.atr14! * tpMultiplier),
        confidence,
        reason: [
          'BUY: EMA20 > EMA50 > EMA200',
          `RSI14=${indicators.rsi14} confirms bullish continuation`,
          `ATR14=${indicators.atr14} defines SL/TP`,
        ].join('. '),
        shouldCreateSignal: true,
      };
    }

    if (bearishAlignment && rsiConfirmsSell) {
      const confidence = this.calculateConfidence({
        emaAligned: true,
        rsiConfirms: true,
        atrStable,
        candleTrendConfirms: bearishCandles,
      });
      return {
        strategyId: strategy.id,
        strategyName: strategy.name,
        direction: SignalDirection.SELL,
        entryPrice,
        stopLoss: this.roundPrice(entryPrice + indicators.atr14! * slMultiplier),
        takeProfit: this.roundPrice(entryPrice - indicators.atr14! * tpMultiplier),
        confidence,
        reason: [
          'SELL: EMA20 < EMA50 < EMA200',
          `RSI14=${indicators.rsi14} confirms bearish continuation`,
          `ATR14=${indicators.atr14} defines SL/TP`,
        ].join('. '),
        shouldCreateSignal: true,
      };
    }

    const reason = bullishAlignment || bearishAlignment
      ? `NO_SIGNAL: RSI14=${indicators.rsi14} does not confirm the aligned EMA trend`
      : 'NO_SIGNAL: EMAs are not aligned';
    return this.noSignal(strategy, entryPrice, reason);
  }

  private readIndicators(metadata: unknown): TechnicalIndicators {
    if (!metadata || typeof metadata !== 'object') {
      return {};
    }
    const indicators = (metadata as { indicators?: Record<string, unknown> }).indicators;
    if (!indicators) {
      return {};
    }
    return {
      ema20: this.numberValue(indicators.ema20),
      ema50: this.numberValue(indicators.ema50),
      ema200: this.numberValue(indicators.ema200),
      rsi14: this.numberValue(indicators.rsi14),
      atr14: this.numberValue(indicators.atr14),
    };
  }

  private readParameters(strategy: StrategyEntity): EmaTrendParameters {
    const parameters = strategy.activeVersion?.parameters;
    return parameters && typeof parameters === 'object' ? (parameters as EmaTrendParameters) : {};
  }

  private missingIndicators(indicators: TechnicalIndicators): string[] {
    return (['ema20', 'ema50', 'ema200', 'rsi14', 'atr14'] as const).filter(
      (key) => indicators[key] === undefined,
    );
  }

  private calculateConfidence(input: {
    emaAligned: boolean;
    rsiConfirms: boolean;
    atrStable: boolean;
    candleTrendConfirms: boolean;
  }): number {
    const score =
      50 +
      (input.emaAligned ? 20 : 0) +
      (input.rsiConfirms ? 15 : 0) +
      (input.atrStable ? 10 : 0) +
      (input.candleTrendConfirms ? 5 : 0);
    return Math.max(0, Math.min(100, score));
  }

  private isConsistentTrend(context: StrategyContext, direction: 'BUY' | 'SELL', candlesCount: number): boolean {
    const candles = [...(context.candles ?? [])]
      .sort((left, right) => left.timestamp.getTime() - right.timestamp.getTime())
      .slice(-candlesCount);
    if (candles.length < candlesCount) {
      return false;
    }
    return candles.every((candle, index) => {
      if (index === 0) {
        return true;
      }
      return direction === 'BUY'
        ? candle.close >= candles[index - 1].close
        : candle.close <= candles[index - 1].close;
    });
  }

  private noSignal(strategy: StrategyEntity, entryPrice: number, reason: string): StrategyResult {
    return {
      strategyId: strategy.id,
      strategyName: strategy.name,
      direction: SignalDirection.NONE,
      entryPrice,
      confidence: 0,
      reason,
      shouldCreateSignal: false,
    };
  }

  private between(value: number, min: number, max: number): boolean {
    return value >= min && value <= max;
  }

  private numberValue(value: unknown): number | undefined {
    return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
  }

  private roundPrice(value: number): number {
    return Number(value.toFixed(8));
  }
}
