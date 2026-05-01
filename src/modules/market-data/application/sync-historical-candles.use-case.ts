import { BadRequestException, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSyncStatus, Timeframe } from '@prisma/client';
import { InternalEventBus } from '@/events/internal-event-bus.service';
import { TRADING_EVENTS } from '@/events/trading-events';
import { TOKENS } from '@/shared/tokens';
import { InstrumentsRepository } from '@/modules/instruments/domain/instruments.repository';
import {
  CreateMarketCandleData,
  MarketCandlesRepository,
} from '../domain/market-candles.repository';
import { MarketDataProvider } from '../domain/market-data-provider.interface';
import { MarketDataSyncJobsRepository } from '../domain/market-data-sync-jobs.repository';

export type SyncHistoricalCandlesInput = {
  instrumentId: string;
  timeframe: Timeframe;
  startTime: Date;
  endTime?: Date;
  limit?: number;
  provider?: string;
  syncJobId?: string;
  triggerAnalysis?: boolean;
};

export type SyncHistoricalCandlesOutput = {
  syncJobId: string;
  provider: string;
  instrumentId: string;
  symbol: string;
  timeframe: Timeframe;
  requestedFrom: Date;
  requestedTo?: Date;
  fetchedCount: number;
  insertedCount: number;
  skippedDuplicates: number;
  firstCandleAt?: Date;
  lastCandleAt?: Date;
  status: DataSyncStatus;
  error?: string;
};

export type QueuedHistoricalCandlesSync = {
  syncJobId: string;
  provider: string;
  instrumentId: string;
  symbol: string;
  timeframe: Timeframe;
  status: DataSyncStatus;
};

@Injectable()
export class SyncHistoricalCandlesUseCase {
  private readonly logger = new Logger(SyncHistoricalCandlesUseCase.name);

  constructor(
    @Inject(TOKENS.INSTRUMENTS_REPOSITORY)
    private readonly instrumentsRepository: InstrumentsRepository,
    @Inject(TOKENS.MARKET_CANDLES_REPOSITORY)
    private readonly candlesRepository: MarketCandlesRepository,
    @Inject(TOKENS.MARKET_DATA_SYNC_JOBS_REPOSITORY)
    private readonly syncJobsRepository: MarketDataSyncJobsRepository,
    @Inject(TOKENS.MARKET_DATA_PROVIDERS)
    private readonly providers: MarketDataProvider[],
    private readonly config: ConfigService,
    private readonly eventBus: InternalEventBus,
  ) {}

  async execute(input: SyncHistoricalCandlesInput): Promise<SyncHistoricalCandlesOutput> {
    this.validateInput(input);

    const { instrument, provider, symbol, limit } = await this.resolveSyncContext(input);

    const startedAt = new Date();
    const syncJob = input.syncJobId
      ? await this.syncJobsRepository.update(input.syncJobId, {
          status: DataSyncStatus.RUNNING,
          startedAt,
        })
      : await this.syncJobsRepository.create({
          provider: provider.getName(),
          instrumentId: instrument.id,
          symbol,
          timeframe: input.timeframe,
          startTime: input.startTime,
          endTime: input.endTime,
          requestedLimit: limit,
          status: DataSyncStatus.RUNNING,
          startedAt,
        });

    try {
      const candles = await provider.fetchHistoricalCandles({
        symbol,
        timeframe: input.timeframe,
        startTime: input.startTime,
        endTime: input.endTime,
        limit,
      });

      const data: CreateMarketCandleData[] = candles.map((candle) => ({
        instrumentId: instrument.id,
        timeframe: candle.timeframe,
        open: candle.open,
        high: candle.high,
        low: candle.low,
        close: candle.close,
        volume: candle.volume,
        timestamp: candle.timestamp,
        source: candle.source,
      }));
      const { insertedCount } = await this.candlesRepository.upsertManyCandles(data);
      const skippedDuplicates = candles.length - insertedCount;
      const sortedCandles = [...candles].sort(
        (a, b) => a.timestamp.getTime() - b.timestamp.getTime(),
      );

      await this.syncJobsRepository.update(syncJob.id, {
        status: DataSyncStatus.COMPLETED,
        fetchedCount: candles.length,
        insertedCount,
        skippedDuplicates,
        finishedAt: new Date(),
        errorMessage: null,
      });

      this.logger.log(
        `Synced ${candles.length} ${symbol} ${input.timeframe} candles from ${provider.getName()}`,
      );

      if (input.triggerAnalysis && insertedCount > 0) {
        const latestInsertedCandle = sortedCandles.at(-1);
        if (latestInsertedCandle) {
          const [persistedCandle] = await this.candlesRepository.findMany({
            instrumentId: instrument.id,
            timeframe: input.timeframe,
            from: latestInsertedCandle.timestamp,
            to: latestInsertedCandle.timestamp,
            limit: 1,
          });
          this.eventBus.emit(TRADING_EVENTS.CANDLE_CLOSED, {
            candleId: persistedCandle?.id,
            instrumentId: instrument.id,
            timeframe: input.timeframe,
            candleTimestamp: latestInsertedCandle.timestamp,
            source: 'SYNC',
            triggerAnalysis: true,
          });
        }
      }

      return {
        syncJobId: syncJob.id,
        provider: provider.getName(),
        instrumentId: instrument.id,
        symbol,
        timeframe: input.timeframe,
        requestedFrom: input.startTime,
        requestedTo: input.endTime,
        fetchedCount: candles.length,
        insertedCount,
        skippedDuplicates,
        firstCandleAt: sortedCandles.at(0)?.timestamp,
        lastCandleAt: sortedCandles.at(-1)?.timestamp,
        status: DataSyncStatus.COMPLETED,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown sync error';
      await this.syncJobsRepository.update(syncJob.id, {
        status: DataSyncStatus.FAILED,
        errorMessage: message,
        finishedAt: new Date(),
      });
      this.logger.error(`Historical candle sync failed for ${symbol}: ${message}`);

      return {
        syncJobId: syncJob.id,
        provider: provider.getName(),
        instrumentId: instrument.id,
        symbol,
        timeframe: input.timeframe,
        requestedFrom: input.startTime,
        requestedTo: input.endTime,
        fetchedCount: 0,
        insertedCount: 0,
        skippedDuplicates: 0,
        status: DataSyncStatus.FAILED,
        error: message,
      };
    }
  }

  async enqueue(input: SyncHistoricalCandlesInput): Promise<QueuedHistoricalCandlesSync> {
    this.validateInput(input);
    const { instrument, provider, symbol, limit } = await this.resolveSyncContext(input);
    const syncJob = await this.syncJobsRepository.create({
      provider: provider.getName(),
      instrumentId: instrument.id,
      symbol,
      timeframe: input.timeframe,
      startTime: input.startTime,
      endTime: input.endTime,
      requestedLimit: limit,
      status: DataSyncStatus.PENDING,
    });

    return {
      syncJobId: syncJob.id,
      provider: provider.getName(),
      instrumentId: instrument.id,
      symbol,
      timeframe: input.timeframe,
      status: DataSyncStatus.PENDING,
    };
  }

  private async resolveSyncContext(input: SyncHistoricalCandlesInput) {
    const instrument = await this.instrumentsRepository.findById(input.instrumentId);
    if (!instrument) {
      throw new NotFoundException('Instrument not found');
    }
    if (!instrument.isActive) {
      throw new BadRequestException('Instrument is inactive');
    }

    const provider = this.resolveProvider(input.provider);
    const symbol = instrument.brokerSymbol ?? instrument.symbol;
    if (!provider.supportsSymbol(symbol)) {
      throw new BadRequestException(`Provider ${provider.getName()} does not support ${symbol}`);
    }

    return { instrument, provider, symbol, limit: this.resolveLimit(input.limit) };
  }

  private resolveProvider(providerName?: string): MarketDataProvider {
    const configuredProvider =
      providerName ?? this.config.get<string>('marketData.defaultProvider') ?? 'BINANCE';
    const provider = this.providers.find(
      (candidate) => candidate.getName() === configuredProvider.toUpperCase(),
    );
    if (!provider) {
      throw new BadRequestException(`Market data provider ${configuredProvider} is not configured`);
    }
    return provider;
  }

  private resolveLimit(limit?: number) {
    const defaultLimit = this.config.get<number>('marketData.syncDefaultLimit') ?? 1000;
    const maxLimit = this.config.get<number>('marketData.syncMaxLimit') ?? 1000;
    const resolvedLimit = limit ?? defaultLimit;
    if (resolvedLimit > maxLimit) {
      throw new BadRequestException(`Limit cannot be greater than ${maxLimit}`);
    }
    return resolvedLimit;
  }

  private validateInput(input: SyncHistoricalCandlesInput) {
    if (input.endTime && input.endTime <= input.startTime) {
      throw new BadRequestException('endTime must be greater than startTime');
    }
  }
}
