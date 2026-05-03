import { BadGatewayException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Timeframe } from '@prisma/client';
import { PythonTechnicalAnalysisProvider } from '@/modules/agents/infrastructure/python-technical-analysis.provider';

describe('PythonTechnicalAnalysisProvider', () => {
  const config = {
    get: jest.fn((key: string) => {
      const values: Record<string, unknown> = {
        'technicalAgent.baseUrl': 'http://technical-agent.test',
      };
      return values[key];
    }),
  } as unknown as ConfigService;

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('sends the expected payload and returns successful analysis', async () => {
    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        symbol: 'BTCUSDT',
        timeframe: 'M15',
        candlesAnalyzed: 200,
        trend: 'BULLISH',
        technicalBias: 'BULLISH',
        confidenceScore: 80,
        indicators: { ema20: 10, ema50: 9, ema200: 8, rsi14: 55, atr14: 1 },
        reasoning: ['EMA20 esta por encima de EMA50 y EMA50 esta por encima de EMA200'],
        warnings: ['El ATR es muy alto en relacion con el precio'],
      }),
    } as Response);

    const provider = new PythonTechnicalAnalysisProvider(config);
    const result = await provider.analyzeCandles({
      symbol: 'BTCUSDT',
      timeframe: Timeframe.M15,
      candles: [
        {
          timestamp: new Date('2024-01-01T00:00:00.000Z'),
          open: 1,
          high: 2,
          low: 1,
          close: 1.5,
          volume: 100,
        },
      ],
    });

    expect(fetchMock).toHaveBeenCalledWith(
      'http://technical-agent.test/technical-analysis/analyze',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: expect.stringContaining('"symbol":"BTCUSDT"'),
      }),
    );
    expect(JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string)).toMatchObject({
      symbol: 'BTCUSDT',
      timeframe: 'M15',
      candles: [{ timestamp: '2024-01-01T00:00:00.000Z' }],
    });
    expect(result.technicalBias).toBe('BULLISH');
    expect(result.indicators.rsi14).toBe(55);
    expect(result.reasoning).toEqual(['EMA20 esta por encima de EMA50 y EMA50 esta por encima de EMA200']);
    expect(result.warnings).toEqual(['El ATR es muy alto en relacion con el precio']);
  });

  it('handles worker HTTP errors', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: false,
      status: 422,
      text: async () => '{"detail":"invalid"}',
    } as Response);

    const provider = new PythonTechnicalAnalysisProvider(config);

    await expect(
      provider.analyzeCandles({
        symbol: 'BTCUSDT',
        timeframe: Timeframe.M15,
        candles: [],
      }),
    ).rejects.toThrow(BadGatewayException);
  });
});
