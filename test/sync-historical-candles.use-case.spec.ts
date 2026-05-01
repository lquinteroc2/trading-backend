import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSyncStatus, MarketType, Timeframe } from '@prisma/client';
import { InstrumentsRepository } from '@/modules/instruments/domain/instruments.repository';
import { MarketCandlesRepository } from '@/modules/market-data/domain/market-candles.repository';
import { MarketDataProvider } from '@/modules/market-data/domain/market-data-provider.interface';
import { MarketDataSyncJobsRepository } from '@/modules/market-data/domain/market-data-sync-jobs.repository';
import { SyncHistoricalCandlesUseCase } from '@/modules/market-data/application/sync-historical-candles.use-case';

describe('SyncHistoricalCandlesUseCase', () => {
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

  const syncJob = {
    id: 'sync-job-id',
    provider: 'BINANCE',
    instrumentId: instrument.id,
    symbol: instrument.symbol,
    timeframe: Timeframe.M15,
    startTime: new Date('2024-01-01T00:00:00.000Z'),
    endTime: null,
    status: DataSyncStatus.RUNNING,
    requestedLimit: 1000,
    fetchedCount: 0,
    insertedCount: 0,
    skippedDuplicates: 0,
    errorMessage: null,
    startedAt: new Date(),
    finishedAt: null,
    createdAt: new Date(),
  };

  const makeUseCase = (overrides?: {
    instruments?: Partial<jest.Mocked<InstrumentsRepository>>;
    candles?: Partial<jest.Mocked<MarketCandlesRepository>>;
    syncJobs?: Partial<jest.Mocked<MarketDataSyncJobsRepository>>;
    provider?: Partial<jest.Mocked<MarketDataProvider>>;
  }) => {
    const instruments = {
      findById: jest.fn().mockResolvedValue(instrument),
    } as unknown as jest.Mocked<InstrumentsRepository>;
    Object.assign(instruments, overrides?.instruments);

    const candles = {
      upsertManyCandles: jest.fn().mockResolvedValue({ insertedCount: 2 }),
    } as unknown as jest.Mocked<MarketCandlesRepository>;
    Object.assign(candles, overrides?.candles);

    const syncJobs = {
      create: jest.fn().mockResolvedValue(syncJob),
      update: jest.fn().mockResolvedValue(syncJob),
    } as unknown as jest.Mocked<MarketDataSyncJobsRepository>;
    Object.assign(syncJobs, overrides?.syncJobs);

    const provider = {
      getName: jest.fn().mockReturnValue('BINANCE'),
      supportsSymbol: jest.fn().mockReturnValue(true),
      fetchHistoricalCandles: jest.fn().mockResolvedValue([
        {
          symbol: 'BTCUSDT',
          timeframe: Timeframe.M15,
          open: 1,
          high: 2,
          low: 0.5,
          close: 1.5,
          volume: 10,
          timestamp: new Date('2024-01-01T00:00:00.000Z'),
          source: 'BINANCE',
        },
        {
          symbol: 'BTCUSDT',
          timeframe: Timeframe.M15,
          open: 2,
          high: 3,
          low: 1.5,
          close: 2.5,
          volume: 20,
          timestamp: new Date('2024-01-01T00:15:00.000Z'),
          source: 'BINANCE',
        },
      ]),
    } as unknown as jest.Mocked<MarketDataProvider>;
    Object.assign(provider, overrides?.provider);

    const config = {
      get: jest.fn((key: string) => {
        const values: Record<string, unknown> = {
          'marketData.defaultProvider': 'BINANCE',
          'marketData.syncDefaultLimit': 1000,
          'marketData.syncMaxLimit': 1000,
        };
        return values[key];
      }),
    } as unknown as ConfigService;

    return {
      useCase: new SyncHistoricalCandlesUseCase(
        instruments,
        candles,
        syncJobs,
        [provider],
        config,
        { emit: jest.fn() } as never,
      ),
      instruments,
      candles,
      syncJobs,
      provider,
    };
  };

  it('fails when instrument does not exist', async () => {
    const { useCase } = makeUseCase({
      instruments: { findById: jest.fn().mockResolvedValue(null) },
    });

    await expect(
      useCase.execute({
        instrumentId: 'missing',
        timeframe: Timeframe.M15,
        startTime: new Date('2024-01-01T00:00:00.000Z'),
      }),
    ).rejects.toThrow(NotFoundException);
  });

  it('fails when instrument is inactive', async () => {
    const { useCase } = makeUseCase({
      instruments: { findById: jest.fn().mockResolvedValue({ ...instrument, isActive: false }) },
    });

    await expect(
      useCase.execute({
        instrumentId: instrument.id,
        timeframe: Timeframe.M15,
        startTime: new Date('2024-01-01T00:00:00.000Z'),
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('saves new candles and returns the sync summary', async () => {
    const { useCase, candles, syncJobs } = makeUseCase();

    const result = await useCase.execute({
      instrumentId: instrument.id,
      timeframe: Timeframe.M15,
      startTime: new Date('2024-01-01T00:00:00.000Z'),
      limit: 1000,
    });

    expect(candles.upsertManyCandles).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          instrumentId: instrument.id,
          timeframe: Timeframe.M15,
          source: 'BINANCE',
        }),
      ]),
    );
    expect(syncJobs.update).toHaveBeenCalledWith(
      syncJob.id,
      expect.objectContaining({ status: DataSyncStatus.COMPLETED, insertedCount: 2 }),
    );
    expect(result).toMatchObject({
      syncJobId: syncJob.id,
      fetchedCount: 2,
      insertedCount: 2,
      skippedDuplicates: 0,
      status: DataSyncStatus.COMPLETED,
    });
  });

  it('reports skipped duplicates', async () => {
    const { useCase } = makeUseCase({
      candles: { upsertManyCandles: jest.fn().mockResolvedValue({ insertedCount: 1 }) },
    });

    const result = await useCase.execute({
      instrumentId: instrument.id,
      timeframe: Timeframe.M15,
      startTime: new Date('2024-01-01T00:00:00.000Z'),
    });

    expect(result.fetchedCount).toBe(2);
    expect(result.insertedCount).toBe(1);
    expect(result.skippedDuplicates).toBe(1);
  });
});
