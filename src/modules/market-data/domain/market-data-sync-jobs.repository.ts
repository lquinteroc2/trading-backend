import { DataSyncStatus, Timeframe } from '@prisma/client';
import { MarketDataSyncJobEntity } from './market-data-sync-job.entity';

export type CreateMarketDataSyncJobData = {
  provider: string;
  instrumentId: string;
  symbol: string;
  timeframe: Timeframe;
  startTime: Date;
  endTime?: Date;
  status?: DataSyncStatus;
  requestedLimit?: number;
  startedAt?: Date;
};

export type UpdateMarketDataSyncJobData = {
  status?: DataSyncStatus;
  fetchedCount?: number;
  insertedCount?: number;
  skippedDuplicates?: number;
  errorMessage?: string | null;
  startedAt?: Date;
  finishedAt?: Date;
};

export type FindMarketDataSyncJobsQuery = {
  provider?: string;
  instrumentId?: string;
  timeframe?: Timeframe;
  status?: DataSyncStatus;
  from?: Date;
  to?: Date;
};

export interface MarketDataSyncJobsRepository {
  create(data: CreateMarketDataSyncJobData): Promise<MarketDataSyncJobEntity>;
  update(id: string, data: UpdateMarketDataSyncJobData): Promise<MarketDataSyncJobEntity>;
  findById(id: string): Promise<MarketDataSyncJobEntity | null>;
  findMany(query: FindMarketDataSyncJobsQuery): Promise<MarketDataSyncJobEntity[]>;
}
