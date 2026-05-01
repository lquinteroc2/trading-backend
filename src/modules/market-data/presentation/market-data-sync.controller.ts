import { Body, Controller, Get, NotFoundException, Param, Post, Query } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { Queue } from 'bullmq';
import { QUEUE_JOBS, QUEUE_NAMES } from '@/queues/queue.constants';
import { MarketDataService } from '../application/market-data.service';
import { SyncHistoricalCandlesUseCase } from '../application/sync-historical-candles.use-case';
import { FindSyncJobsDto } from './dto/find-sync-jobs.dto';
import { SyncHistoricalCandlesDto } from './dto/sync-historical-candles.dto';

@ApiTags('market-data-sync')
@Controller('market-data')
export class MarketDataSyncController {
  constructor(
    private readonly syncHistoricalCandles: SyncHistoricalCandlesUseCase,
    private readonly marketDataService: MarketDataService,
    @InjectQueue(QUEUE_NAMES.HISTORICAL_MARKET_DATA_SYNC)
    private readonly syncQueue: Queue,
  ) {}

  @Post('sync')
  @ApiCreatedResponse({ description: 'Historical candles synchronized directly.' })
  sync(@Body() dto: SyncHistoricalCandlesDto) {
    return this.syncHistoricalCandles.execute(this.toUseCaseInput(dto));
  }

  @Post('sync/enqueue')
  @ApiCreatedResponse({ description: 'Historical candle sync job queued.' })
  async enqueue(@Body() dto: SyncHistoricalCandlesDto) {
    const pendingSync = await this.syncHistoricalCandles.enqueue(this.toUseCaseInput(dto));
    const job = await this.syncQueue.add(QUEUE_JOBS.SYNC_HISTORICAL_CANDLES, {
      ...dto,
      syncJobId: pendingSync.syncJobId,
    });

    return {
      jobId: job.id,
      syncJobId: pendingSync.syncJobId,
      provider: pendingSync.provider,
      symbol: pendingSync.symbol,
      timeframe: pendingSync.timeframe,
      status: 'QUEUED',
    };
  }

  @Get('sync-jobs')
  @ApiOkResponse({ description: 'Historical market data sync jobs.' })
  findSyncJobs(@Query() query: FindSyncJobsDto) {
    return this.marketDataService.findSyncJobs({
      provider: query.provider,
      instrumentId: query.instrumentId,
      timeframe: query.timeframe,
      status: query.status,
      from: query.from ? new Date(query.from) : undefined,
      to: query.to ? new Date(query.to) : undefined,
    });
  }

  @Get('sync-jobs/:id')
  @ApiOkResponse({ description: 'Historical market data sync job by id.' })
  async findSyncJobById(@Param('id') id: string) {
    const syncJob = await this.marketDataService.findSyncJobById(id);
    if (!syncJob) {
      throw new NotFoundException('Sync job not found');
    }
    return syncJob;
  }

  private toUseCaseInput(dto: SyncHistoricalCandlesDto) {
    return {
      instrumentId: dto.instrumentId,
      timeframe: dto.timeframe,
      startTime: new Date(dto.startTime),
      endTime: dto.endTime ? new Date(dto.endTime) : undefined,
      limit: dto.limit,
      provider: dto.provider,
    };
  }
}
