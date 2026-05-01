import { BadGatewayException, BadRequestException, HttpException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Timeframe } from '@prisma/client';
import {
  BinanceMarketDataProvider,
  BINANCE_TIMEFRAME_MAP,
} from '@/modules/market-data/infrastructure/binance-market-data.provider';

describe('BinanceMarketDataProvider', () => {
  const config = {
    get: jest.fn((key: string) => {
      const values: Record<string, unknown> = {
        'binance.apiBaseUrl': 'https://api.binance.test',
        'marketData.syncDefaultLimit': 1000,
      };
      return values[key];
    }),
  } as unknown as ConfigService;

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('maps internal timeframes to Binance intervals', () => {
    expect(BINANCE_TIMEFRAME_MAP[Timeframe.M1]).toBe('1m');
    expect(BINANCE_TIMEFRAME_MAP[Timeframe.M15]).toBe('15m');
    expect(BINANCE_TIMEFRAME_MAP[Timeframe.H4]).toBe('4h');
    expect(BINANCE_TIMEFRAME_MAP[Timeframe.D1]).toBe('1d');
  });

  it('maps klines to normalized candles', async () => {
    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => [
        [
          1704067200000,
          '42000.10000000',
          '42100.20000000',
          '41900.30000000',
          '42050.40000000',
          '12.50000000',
          1704068099999,
          '0',
          10,
          '0',
          '0',
          '0',
        ],
      ],
    } as Response);

    const provider = new BinanceMarketDataProvider(config);
    const candles = await provider.fetchHistoricalCandles({
      symbol: 'BTCUSDT',
      timeframe: Timeframe.M15,
      startTime: new Date('2024-01-01T00:00:00.000Z'),
      limit: 1000,
    });

    expect(fetchMock).toHaveBeenCalledWith(
      new URL(
        'https://api.binance.test/api/v3/klines?symbol=BTCUSDT&interval=15m&startTime=1704067200000&limit=1000',
      ),
    );
    expect(candles[0]).toMatchObject({
      symbol: 'BTCUSDT',
      timeframe: Timeframe.M15,
      open: 42000.1,
      high: 42100.2,
      low: 41900.3,
      close: 42050.4,
      volume: 12.5,
      source: 'BINANCE',
    });
    expect(candles[0].timestamp).toEqual(new Date('2024-01-01T00:00:00.000Z'));
  });

  it('rejects unsupported symbols', async () => {
    const provider = new BinanceMarketDataProvider(config);

    await expect(
      provider.fetchHistoricalCandles({
        symbol: 'XAUUSD',
        timeframe: Timeframe.M15,
        startTime: new Date('2024-01-01T00:00:00.000Z'),
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('handles Binance HTTP errors clearly', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: false,
      status: 500,
      text: async () => '{"msg":"boom"}',
    } as Response);
    const provider = new BinanceMarketDataProvider(config);

    await expect(
      provider.fetchHistoricalCandles({
        symbol: 'BTCUSDT',
        timeframe: Timeframe.M15,
        startTime: new Date('2024-01-01T00:00:00.000Z'),
      }),
    ).rejects.toThrow(BadGatewayException);
  });

  it('handles Binance rate limits', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: false,
      status: 429,
      text: async () => '',
    } as Response);
    const provider = new BinanceMarketDataProvider(config);

    await expect(
      provider.fetchHistoricalCandles({
        symbol: 'BTCUSDT',
        timeframe: Timeframe.M15,
        startTime: new Date('2024-01-01T00:00:00.000Z'),
      }),
    ).rejects.toThrow(HttpException);
  });
});
