import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { Timeframe } from '@prisma/client';
import { MarketDataSyncController } from '@/modules/market-data/presentation/market-data-sync.controller';
import { SyncHistoricalCandlesDto } from '@/modules/market-data/presentation/dto/sync-historical-candles.dto';

describe('MarketDataSyncController', () => {
  it('validates sync DTOs', async () => {
    const dto = plainToInstance(SyncHistoricalCandlesDto, {
      instrumentId: 'not-a-uuid',
      timeframe: 'M99',
      startTime: 'not-a-date',
      limit: 1001,
    });

    const errors = await validate(dto);

    expect(errors.map((error) => error.property)).toEqual(
      expect.arrayContaining(['instrumentId', 'timeframe', 'startTime', 'limit']),
    );
  });

  it('returns direct sync response structure', async () => {
    const syncUseCase = {
      execute: jest.fn().mockResolvedValue({
        syncJobId: 'sync-job-id',
        provider: 'BINANCE',
        symbol: 'BTCUSDT',
        timeframe: Timeframe.M15,
        fetchedCount: 1000,
        insertedCount: 1000,
        skippedDuplicates: 0,
        status: 'COMPLETED',
      }),
    };
    const controller = new MarketDataSyncController(
      syncUseCase as never,
      { findSyncJobs: jest.fn(), findSyncJobById: jest.fn() } as never,
      { add: jest.fn() } as never,
    );

    const response = await controller.sync({
      instrumentId: '11111111-1111-1111-1111-111111111111',
      timeframe: Timeframe.M15,
      startTime: '2024-01-01T00:00:00.000Z',
      limit: 1000,
      provider: 'BINANCE',
    });

    expect(response).toMatchObject({
      syncJobId: 'sync-job-id',
      provider: 'BINANCE',
      symbol: 'BTCUSDT',
      timeframe: Timeframe.M15,
      fetchedCount: 1000,
      insertedCount: 1000,
      skippedDuplicates: 0,
      status: 'COMPLETED',
    });
  });

  it('enqueues sync jobs', async () => {
    const syncUseCase = {
      enqueue: jest.fn().mockResolvedValue({
        syncJobId: 'sync-job-id',
        provider: 'BINANCE',
        symbol: 'BTCUSDT',
        timeframe: Timeframe.M15,
        status: 'PENDING',
      }),
    };
    const queue = { add: jest.fn().mockResolvedValue({ id: 'bull-job-id' }) };
    const controller = new MarketDataSyncController(
      syncUseCase as never,
      { findSyncJobs: jest.fn(), findSyncJobById: jest.fn() } as never,
      queue as never,
    );

    const response = await controller.enqueue({
      instrumentId: '11111111-1111-1111-1111-111111111111',
      timeframe: Timeframe.M15,
      startTime: '2024-01-01T00:00:00.000Z',
      limit: 1000,
      provider: 'BINANCE',
    });

    expect(queue.add).toHaveBeenCalled();
    expect(response).toMatchObject({
      jobId: 'bull-job-id',
      syncJobId: 'sync-job-id',
      status: 'QUEUED',
    });
  });
});
