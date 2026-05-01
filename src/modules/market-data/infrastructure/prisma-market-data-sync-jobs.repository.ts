import { Injectable } from '@nestjs/common';
import { DataSyncStatus, Timeframe } from '@prisma/client';
import { PrismaService } from '@/database/prisma.service';
import { MarketDataSyncJobEntity } from '../domain/market-data-sync-job.entity';
import {
  CreateMarketDataSyncJobData,
  FindMarketDataSyncJobsQuery,
  MarketDataSyncJobsRepository,
  UpdateMarketDataSyncJobData,
} from '../domain/market-data-sync-jobs.repository';

@Injectable()
export class PrismaMarketDataSyncJobsRepository implements MarketDataSyncJobsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateMarketDataSyncJobData): Promise<MarketDataSyncJobEntity> {
    const job = await this.prisma.marketDataSyncJob.create({
      data: {
        ...data,
        endTime: data.endTime ?? null,
        requestedLimit: data.requestedLimit ?? null,
      },
    });
    return this.toEntity(job);
  }

  async update(
    id: string,
    data: UpdateMarketDataSyncJobData,
  ): Promise<MarketDataSyncJobEntity> {
    const job = await this.prisma.marketDataSyncJob.update({ where: { id }, data });
    return this.toEntity(job);
  }

  async findById(id: string): Promise<MarketDataSyncJobEntity | null> {
    const job = await this.prisma.marketDataSyncJob.findUnique({ where: { id } });
    return job ? this.toEntity(job) : null;
  }

  async findMany(query: FindMarketDataSyncJobsQuery): Promise<MarketDataSyncJobEntity[]> {
    const jobs = await this.prisma.marketDataSyncJob.findMany({
      where: {
        provider: query.provider,
        instrumentId: query.instrumentId,
        timeframe: query.timeframe,
        status: query.status,
        createdAt: {
          gte: query.from,
          lte: query.to,
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    return jobs.map((job) => this.toEntity(job));
  }

  private toEntity(job: {
    id: string;
    provider: string;
    instrumentId: string;
    symbol: string;
    timeframe: Timeframe;
    startTime: Date;
    endTime: Date | null;
    status: DataSyncStatus;
    requestedLimit: number | null;
    fetchedCount: number;
    insertedCount: number;
    skippedDuplicates: number;
    errorMessage: string | null;
    startedAt: Date | null;
    finishedAt: Date | null;
    createdAt: Date;
  }) {
    return new MarketDataSyncJobEntity(
      job.id,
      job.provider,
      job.instrumentId,
      job.symbol,
      job.timeframe,
      job.startTime,
      job.endTime,
      job.status,
      job.requestedLimit,
      job.fetchedCount,
      job.insertedCount,
      job.skippedDuplicates,
      job.errorMessage,
      job.startedAt,
      job.finishedAt,
      job.createdAt,
    );
  }
}
