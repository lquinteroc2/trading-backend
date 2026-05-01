import { Injectable } from '@nestjs/common';
import { MarketCandleEntity } from '@/modules/market-data/domain/market-candle.entity';
import { TechnicalIndicators } from '@/modules/strategies/domain/strategy.types';

@Injectable()
export class BacktestingIndicatorsService {
  calculate(candles: MarketCandleEntity[]): TechnicalIndicators {
    return {
      ema20: this.ema(candles, 20),
      ema50: this.ema(candles, 50),
      ema200: this.ema(candles, 200),
      rsi14: this.rsi(candles, 14),
      atr14: this.atr(candles, 14),
    };
  }

  private ema(candles: MarketCandleEntity[], period: number): number | undefined {
    if (candles.length < period) {
      return undefined;
    }
    const closes = candles.map((candle) => candle.close);
    let ema = closes.slice(0, period).reduce((sum, close) => sum + close, 0) / period;
    const multiplier = 2 / (period + 1);

    for (const close of closes.slice(period)) {
      ema = (close - ema) * multiplier + ema;
    }

    return this.round(ema);
  }

  private rsi(candles: MarketCandleEntity[], period: number): number | undefined {
    if (candles.length <= period) {
      return undefined;
    }

    const closes = candles.map((candle) => candle.close);
    let gains = 0;
    let losses = 0;

    for (let index = 1; index <= period; index += 1) {
      const change = closes[index] - closes[index - 1];
      gains += Math.max(change, 0);
      losses += Math.max(-change, 0);
    }

    let averageGain = gains / period;
    let averageLoss = losses / period;

    for (let index = period + 1; index < closes.length; index += 1) {
      const change = closes[index] - closes[index - 1];
      averageGain = (averageGain * (period - 1) + Math.max(change, 0)) / period;
      averageLoss = (averageLoss * (period - 1) + Math.max(-change, 0)) / period;
    }

    if (averageLoss === 0) {
      return 100;
    }

    const relativeStrength = averageGain / averageLoss;
    return this.round(100 - 100 / (1 + relativeStrength));
  }

  private atr(candles: MarketCandleEntity[], period: number): number | undefined {
    if (candles.length <= period) {
      return undefined;
    }

    const trueRanges: number[] = [];
    for (let index = 1; index < candles.length; index += 1) {
      const current = candles[index];
      const previous = candles[index - 1];
      trueRanges.push(
        Math.max(
          current.high - current.low,
          Math.abs(current.high - previous.close),
          Math.abs(current.low - previous.close),
        ),
      );
    }

    let atr = trueRanges.slice(0, period).reduce((sum, value) => sum + value, 0) / period;
    for (const trueRange of trueRanges.slice(period)) {
      atr = (atr * (period - 1) + trueRange) / period;
    }

    return this.round(atr);
  }

  private round(value: number): number {
    return Number(value.toFixed(8));
  }
}
