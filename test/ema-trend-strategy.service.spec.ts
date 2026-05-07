import { ConfigService } from '@nestjs/config';
import {
  AgentDecisionAction,
  AgentExecutionSource,
  AgentType,
  SignalDirection,
  StrategyStatus,
  Timeframe,
} from '@prisma/client';
import { EmaTrendStrategyService } from '@/modules/strategies/application/ema-trend-strategy.service';
import { StrategyContext } from '@/modules/strategies/domain/strategy.types';

describe('EmaTrendStrategyService', () => {
  const strategy = {
    id: 'ema-trend-strategy',
    name: 'EMA_TREND_STRATEGY',
    description: 'EMA trend',
    status: StrategyStatus.ACTIVE,
    createdAt: new Date(),
    activeVersion: {
      id: 'v1',
      strategyId: 'ema-trend-strategy',
      version: 'v1',
      parameters: {
        rsiBuyMin: 45,
        rsiBuyMax: 70,
        rsiSellMin: 30,
        rsiSellMax: 55,
        atrStableMaxPercentOfPrice: 5,
        trendConsistencyCandles: 3,
      },
      isActive: true,
      createdAt: new Date(),
    },
  };

  const service = new EmaTrendStrategyService({
    get: jest.fn(
      (key: string) =>
        ({ 'signals.atrStopLossMultiplier': 1.5, 'signals.atrTakeProfitMultiplier': 3 })[key],
    ),
  } as unknown as ConfigService);

  const context = (
    indicators: Record<string, number>,
    metadataOverrides: Record<string, unknown> = {},
  ): StrategyContext => ({
    instrumentId: 'instrument-id',
    symbol: 'BTCUSDT',
    timeframe: Timeframe.M15,
    technicalAnalysis: {
      id: 'decision-id',
      agentType: AgentType.TECHNICAL,
      instrumentId: 'instrument-id',
      signalId: null,
      decision: AgentDecisionAction.APPROVE,
      executionSource: AgentExecutionSource.QUEUE,
      confidenceScore: 80,
      reasoning: 'technical',
      metadata: {
        symbol: 'BTCUSDT',
        timeframe: Timeframe.M15,
        technicalBias: 'BULLISH',
        indicators,
        ...metadataOverrides,
      },
      createdAt: new Date(),
    },
    latestCandle: {
      id: 'candle-3',
      instrumentId: 'instrument-id',
      timeframe: Timeframe.M15,
      open: 110,
      high: 112,
      low: 109,
      close: 111,
      volume: 1000,
      timestamp: new Date('2026-05-01T00:30:00.000Z'),
      source: 'BINANCE',
      createdAt: new Date(),
    },
    candles: [109, 110, 111].map((close, index) => ({
      id: `candle-${index}`,
      instrumentId: 'instrument-id',
      timeframe: Timeframe.M15,
      open: close - 1,
      high: close + 1,
      low: close - 2,
      close,
      volume: 1000,
      timestamp: new Date(Date.UTC(2026, 4, 1, 0, index * 15)),
      source: 'BINANCE',
      createdAt: new Date(),
    })),
  });

  it('generates BUY when EMAs and RSI confirm bullish trend', () => {
    const result = service.evaluate(
      context({ ema20: 120, ema50: 115, ema200: 100, rsi14: 60, atr14: 2 }),
      strategy,
    );

    expect(result).toMatchObject({
      direction: SignalDirection.BUY,
      stopLoss: 108,
      takeProfit: 117,
      confidence: 100,
      shouldCreateSignal: true,
    });
  });

  it('generates SELL when EMAs and RSI confirm bearish trend', () => {
    const bearish = context({ ema20: 90, ema50: 95, ema200: 100, rsi14: 45, atr14: 2 });
    bearish.candles = [113, 112, 111].map((close, index) => ({
      ...bearish.latestCandle,
      id: `bearish-${index}`,
      close,
      timestamp: new Date(Date.UTC(2026, 4, 1, 0, index * 15)),
    }));

    const result = service.evaluate(bearish, strategy);

    expect(result).toMatchObject({
      direction: SignalDirection.SELL,
      stopLoss: 114,
      takeProfit: 105,
      confidence: 100,
      shouldCreateSignal: true,
    });
  });

  it('avoids signals in sideways markets', () => {
    const result = service.evaluate(
      context({ ema20: 100, ema50: 101, ema200: 99, rsi14: 50, atr14: 2 }),
      strategy,
    );

    expect(result.direction).toBe(SignalDirection.NONE);
    expect(result.shouldCreateSignal).toBe(false);
  });

  it('blocks signal by ranging market metadata', () => {
    const result = service.evaluate(
      context(
        { ema20: 120, ema50: 115, ema200: 100, rsi14: 60, atr14: 2 },
        { marketRegime: { isRanging: true } },
      ),
      strategy,
    );

    expect(result.direction).toBe(SignalDirection.NONE);
    expect(result.reason).toContain('ranging');
  });

  it('blocks signal by conflicted multi-timeframe metadata', () => {
    const result = service.evaluate(
      context(
        { ema20: 120, ema50: 115, ema200: 100, rsi14: 60, atr14: 2 },
        { multiTimeframe: { alignment: 'CONFLICTED' } },
      ),
      strategy,
    );

    expect(result.direction).toBe(SignalDirection.NONE);
    expect(result.reason).toContain('multi-timeframe');
  });
});
