import { Inject, Injectable } from '@nestjs/common';
import { TOKENS } from '@/shared/tokens';
import {
  CreateMarketCandleData,
  FindCandlesQuery,
  MarketCandlesRepository,
} from '../domain/market-candles.repository';
import {
  FindMarketDataSyncJobsQuery,
  MarketDataSyncJobsRepository,
} from '../domain/market-data-sync-jobs.repository';

@Injectable()
export class MarketDataService {
  constructor(
    @Inject(TOKENS.MARKET_CANDLES_REPOSITORY)
    private readonly candlesRepository: MarketCandlesRepository,
    @Inject(TOKENS.MARKET_DATA_SYNC_JOBS_REPOSITORY)
    private readonly syncJobsRepository: MarketDataSyncJobsRepository,
  ) {}

  createCandle(data: CreateMarketCandleData) {
    return this.candlesRepository.create(data);
  }

  createBulk(data: CreateMarketCandleData[]) {
    return this.candlesRepository.createMany(data);
  }

  findCandles(query: FindCandlesQuery) {
    return this.candlesRepository.findMany(query);
  }

  findSyncJobs(query: FindMarketDataSyncJobsQuery) {
    return this.syncJobsRepository.findMany(query);
  }

  findSyncJobById(id: string) {
    return this.syncJobsRepository.findById(id);
  }
}
