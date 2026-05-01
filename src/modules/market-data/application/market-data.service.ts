import { Inject, Injectable } from '@nestjs/common';
import { InternalEventBus } from '@/events/internal-event-bus.service';
import { TRADING_EVENTS } from '@/events/trading-events';
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
    private readonly eventBus: InternalEventBus,
  ) {}

  async createCandle(data: CreateMarketCandleData) {
    const candle = await this.candlesRepository.create(data);
    this.eventBus.emit(TRADING_EVENTS.CANDLE_CREATED, candle);
    this.eventBus.emit(TRADING_EVENTS.CANDLE_CLOSED, {
      instrumentId: candle.instrumentId,
      timeframe: candle.timeframe,
      candleTimestamp: candle.timestamp,
      source: data.source.toUpperCase() === 'REALTIME' ? 'REALTIME' : 'MANUAL',
      triggerAnalysis: true,
    });
    return candle;
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
