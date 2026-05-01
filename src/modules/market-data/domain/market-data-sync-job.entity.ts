import { DataSyncStatus, Timeframe } from '@prisma/client';

export class MarketDataSyncJobEntity {
  constructor(
    public readonly id: string,
    public readonly provider: string,
    public readonly instrumentId: string,
    public readonly symbol: string,
    public readonly timeframe: Timeframe,
    public readonly startTime: Date,
    public readonly endTime: Date | null,
    public readonly status: DataSyncStatus,
    public readonly requestedLimit: number | null,
    public readonly fetchedCount: number,
    public readonly insertedCount: number,
    public readonly skippedDuplicates: number,
    public readonly errorMessage: string | null,
    public readonly startedAt: Date | null,
    public readonly finishedAt: Date | null,
    public readonly createdAt: Date,
  ) {}
}
