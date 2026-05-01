import { ConfigService } from '@nestjs/config';
import {
  AgentDecisionAction,
  AgentExecutionSource,
  AgentType,
  MarketType,
  SignalDirection,
  SignalStatus,
  SourceAgent,
  Timeframe,
} from '@prisma/client';
import { SignalGenerationService } from '@/modules/strategies/application/signal-generation.service';

describe('SignalGenerationService', () => {
  const instrument = {
    id: 'instrument-id',
    symbol: 'BTCUSDT',
    name: 'Bitcoin vs Tether',
    marketType: MarketType.CRYPTO,
    brokerSymbol: 'BTCUSDT',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const decision = {
    id: 'decision-id',
    agentType: AgentType.TECHNICAL,
    instrumentId: instrument.id,
    signalId: null,
    decision: AgentDecisionAction.APPROVE,
    executionSource: AgentExecutionSource.QUEUE,
    confidenceScore: 80,
    reasoning: 'technical',
    metadata: {
      symbol: 'BTCUSDT',
      timeframe: Timeframe.M15,
      technicalBias: 'BULLISH',
      indicators: { ema20: 120, ema50: 115, ema200: 100, rsi14: 60, atr14: 2 },
    },
    createdAt: new Date(),
  };

  const latestCandle = {
    id: 'candle-id',
    instrumentId: instrument.id,
    timeframe: Timeframe.M15,
    open: 110,
    high: 112,
    low: 109,
    close: 111,
    volume: 1000,
    timestamp: new Date('2026-05-01T00:30:00.000Z'),
    source: 'BINANCE',
    createdAt: new Date(),
  };

  const signal = {
    id: 'signal-id',
    instrumentId: instrument.id,
    strategyId: 'ema-trend-strategy',
    timeframe: Timeframe.M15,
    direction: SignalDirection.BUY,
    entryPrice: 111,
    stopLoss: 108,
    takeProfit: 117,
    confidenceScore: 90,
    status: SignalStatus.CREATED,
    sourceAgent: SourceAgent.TECHNICAL,
    candleTimestamp: latestCandle.timestamp,
    reason: 'BUY',
    reasoning: 'BUY',
    createdAt: new Date(),
    expiresAt: null,
  };

  const makeService = (overrides?: { existingSignal?: typeof signal | null; technicalConfidence?: number }) => {
    const decisions = {
      findById: jest.fn().mockResolvedValue({
        ...decision,
        confidenceScore: overrides?.technicalConfidence ?? decision.confidenceScore,
      }),
      findLatest: jest.fn(),
    };
    const instruments = { findById: jest.fn().mockResolvedValue(instrument) };
    const candles = { findMany: jest.fn().mockResolvedValue([latestCandle]) };
    const signals = {
      findByCandleKey: jest.fn().mockResolvedValue(overrides?.existingSignal ?? null),
      create: jest.fn().mockResolvedValue(signal),
    };
    const strategyEngine = {
      evaluateActiveStrategies: jest.fn().mockResolvedValue([
        {
          strategyId: 'ema-trend-strategy',
          strategyName: 'EMA_TREND_STRATEGY',
          direction: SignalDirection.BUY,
          entryPrice: 111,
          stopLoss: 108,
          takeProfit: 117,
          confidence: 90,
          reason: 'BUY',
          shouldCreateSignal: true,
        },
      ]),
    };
    const config = {
      get: jest.fn((key: string) => ({ 'signals.minConfidence': 50 })[key]),
    } as unknown as ConfigService;

    return {
      service: new SignalGenerationService(
        decisions as never,
        instruments as never,
        candles as never,
        signals as never,
        strategyEngine as never,
        config,
      ),
      signals,
      strategyEngine,
    };
  };

  it('saves generated signals with strategy and candle identity', async () => {
    const { service, signals } = makeService();

    const result = await service.generate({ agentDecisionId: decision.id });

    expect(result.status).toBe('CREATED');
    expect(signals.create).toHaveBeenCalledWith(
      expect.objectContaining({
        instrumentId: instrument.id,
        strategyId: 'ema-trend-strategy',
        timeframe: Timeframe.M15,
        direction: SignalDirection.BUY,
        status: SignalStatus.CREATED,
        sourceAgent: SourceAgent.TECHNICAL,
        candleTimestamp: latestCandle.timestamp,
      }),
    );
  });

  it('avoids duplicate signals for the same candle', async () => {
    const { service, signals, strategyEngine } = makeService({ existingSignal: signal });

    const result = await service.generate({ agentDecisionId: decision.id });

    expect(result.status).toBe('SKIPPED_DUPLICATE');
    expect(strategyEngine.evaluateActiveStrategies).not.toHaveBeenCalled();
    expect(signals.create).not.toHaveBeenCalled();
  });

  it('does not generate when technical confidence is below the minimum', async () => {
    const { service, signals } = makeService({ technicalConfidence: 49 });

    const result = await service.generate({ agentDecisionId: decision.id });

    expect(result.status).toBe('NO_SIGNAL');
    expect(signals.create).not.toHaveBeenCalled();
  });
});
