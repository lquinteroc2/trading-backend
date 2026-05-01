import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Timeframe } from '@prisma/client';
import { Job } from 'bullmq';
import { QUEUE_JOBS, QUEUE_NAMES } from '@/queues/queue.constants';
import { SyncHistoricalCandlesUseCase } from '../application/sync-historical-candles.use-case';

export type HistoricalMarketDataSyncJobPayload = {
  syncJobId: string;
  instrumentId: string;
  timeframe: Timeframe;
  startTime: string;
  endTime?: string;
  limit?: number;
  provider?: string;
};

@Processor(QUEUE_NAMES.HISTORICAL_MARKET_DATA_SYNC)
export class HistoricalMarketDataSyncProcessor extends WorkerHost {
  private readonly logger = new Logger(HistoricalMarketDataSyncProcessor.name);

  constructor(private readonly syncHistoricalCandles: SyncHistoricalCandlesUseCase) {
    super();
  }

  async process(job: Job<HistoricalMarketDataSyncJobPayload>): Promise<void> {
    if (job.name !== QUEUE_JOBS.SYNC_HISTORICAL_CANDLES) {
      this.logger.warn(`Ignoring unknown job ${job.name}`);
      return;
    }

    const payload = job.data;
    await this.syncHistoricalCandles.execute({
      syncJobId: payload.syncJobId,
      instrumentId: payload.instrumentId,
      timeframe: payload.timeframe,
      startTime: new Date(payload.startTime),
      endTime: payload.endTime ? new Date(payload.endTime) : undefined,
      limit: payload.limit,
      provider: payload.provider,
    });
  }
}
