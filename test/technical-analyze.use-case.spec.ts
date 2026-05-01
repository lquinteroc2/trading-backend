import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AgentDecisionAction, AgentType, MarketType, Timeframe } from '@prisma/client';
import { TechnicalAnalyzeUseCase } from '@/modules/agents/application/technical-analyze.use-case';
import { AgentDecisionsRepository } from '@/modules/agents/domain/agent-decisions.repository';
import { TechnicalAnalysisProvider } from '@/modules/agents/domain/technical-analysis-provider.interface';
import { InstrumentsRepository } from '@/modules/instruments/domain/instruments.repository';
import { MarketCandlesRepository } from '@/modules/market-data/domain/market-candles.repository';

describe('TechnicalAnalyzeUseCase', () => {
  const instrument = {
    id: '1d1ae365-2e9d-4f59-a047-158a84f7f125',
    symbol: 'BTCUSDT',
    name: 'Bitcoin vs Tether',
    marketType: MarketType.CRYPTO,
    brokerSymbol: 'BTCUSDT',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const makeCandles = (count: number) =>
    Array.from({ length: count }, (_, index) => ({
      id: `candle-${index}`,
      instrumentId: instrument.id,
      timeframe: Timeframe.M15,
      open: 100 + index,
      high: 102 + index,
      low: 99 + index,
      close: 101 + index,
      volume: 1000,
      timestamp: new Date(Date.UTC(2024, 0, 1, 0, index)),
      source: 'BINANCE',
      createdAt: new Date(),
    }));

  const makeUseCase = (overrides?: {
    candlesCount?: number;
    provider?: Partial<jest.Mocked<TechnicalAnalysisProvider>>;
  }) => {
    const instruments = {
      findById: jest.fn().mockResolvedValue(instrument),
    } as unknown as jest.Mocked<InstrumentsRepository>;

    const candles = {
      findMany: jest.fn().mockResolvedValue(makeCandles(overrides?.candlesCount ?? 200)),
    } as unknown as jest.Mocked<MarketCandlesRepository>;

    const decisions = {
      create: jest.fn().mockResolvedValue({
        id: 'decision-id',
        agentType: AgentType.TECHNICAL,
        instrumentId: instrument.id,
        signalId: null,
        decision: AgentDecisionAction.APPROVE,
        confidenceScore: 80,
        reasoning: null,
        metadata: null,
        createdAt: new Date(),
      }),
    } as unknown as jest.Mocked<AgentDecisionsRepository>;

    const provider = {
      analyzeCandles: jest.fn().mockResolvedValue({
        symbol: 'BTCUSDT',
        timeframe: Timeframe.M15,
        candlesAnalyzed: 200,
        trend: 'BULLISH',
        technicalBias: 'BULLISH',
        confidenceScore: 80,
        indicators: { ema20: 10, ema50: 9, ema200: 8, rsi14: 55, atr14: 1 },
        reasoning: ['bullish alignment'],
        warnings: [],
      }),
    } as unknown as jest.Mocked<TechnicalAnalysisProvider>;
    Object.assign(provider, overrides?.provider);

    const config = {
      get: jest.fn((key: string) => {
        const values: Record<string, unknown> = {
          'technicalAgent.minCandles': 200,
          'technicalAgent.defaultLimit': 1000,
        };
        return values[key];
      }),
    } as unknown as ConfigService;

    return {
      useCase: new TechnicalAnalyzeUseCase(instruments, candles, decisions, provider, config),
      candles,
      decisions,
      provider,
    };
  };

  it('fails if there are not enough candles', async () => {
    const { useCase } = makeUseCase({ candlesCount: 199 });

    await expect(
      useCase.execute({ instrumentId: instrument.id, timeframe: Timeframe.M15, limit: 200 }),
    ).rejects.toThrow(BadRequestException);
  });

  it('saves AgentDecision and returns technical analysis fields', async () => {
    const { useCase, decisions, provider } = makeUseCase();

    const result = await useCase.execute({
      instrumentId: instrument.id,
      timeframe: Timeframe.M15,
      limit: 200,
    });

    expect(provider.analyzeCandles).toHaveBeenCalledWith(
      expect.objectContaining({
        symbol: 'BTCUSDT',
        timeframe: Timeframe.M15,
        candles: expect.arrayContaining([expect.objectContaining({ close: expect.any(Number) })]),
      }),
    );
    expect(decisions.create).toHaveBeenCalledWith(
      expect.objectContaining({
        agentType: AgentType.TECHNICAL,
        instrumentId: instrument.id,
        decision: AgentDecisionAction.APPROVE,
        confidenceScore: 80,
        metadata: expect.objectContaining({
          indicators: expect.objectContaining({ rsi14: 55 }),
        }),
      }),
    );
    expect(result).toMatchObject({
      technicalBias: 'BULLISH',
      indicators: { ema20: 10, ema50: 9, ema200: 8, rsi14: 55, atr14: 1 },
      agentDecisionId: 'decision-id',
    });
  });
});
