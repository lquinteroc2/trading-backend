import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { QUEUE_NAMES } from '@/queues/queue.constants';
import { TOKENS } from '@/shared/tokens';
import { InstrumentsModule } from '../instruments/instruments.module';
import { MarketDataService } from './application/market-data.service';
import { SyncHistoricalCandlesUseCase } from './application/sync-historical-candles.use-case';
import { BinanceMarketDataProvider } from './infrastructure/binance-market-data.provider';
import { HistoricalMarketDataSyncProcessor } from './infrastructure/historical-market-data-sync.processor';
import { PrismaMarketCandlesRepository } from './infrastructure/prisma-market-candles.repository';
import { PrismaMarketDataSyncJobsRepository } from './infrastructure/prisma-market-data-sync-jobs.repository';
import { MarketDataController } from './presentation/market-data.controller';
import { MarketDataSyncController } from './presentation/market-data-sync.controller';

@Module({
  imports: [
    InstrumentsModule,
    BullModule.registerQueue({ name: QUEUE_NAMES.HISTORICAL_MARKET_DATA_SYNC }),
  ],
  controllers: [MarketDataController, MarketDataSyncController],
  providers: [
    MarketDataService,
    SyncHistoricalCandlesUseCase,
    BinanceMarketDataProvider,
    HistoricalMarketDataSyncProcessor,
    { provide: TOKENS.MARKET_CANDLES_REPOSITORY, useClass: PrismaMarketCandlesRepository },
    {
      provide: TOKENS.MARKET_DATA_SYNC_JOBS_REPOSITORY,
      useClass: PrismaMarketDataSyncJobsRepository,
    },
    {
      provide: TOKENS.MARKET_DATA_PROVIDERS,
      useFactory: (binanceProvider: BinanceMarketDataProvider) => [binanceProvider],
      inject: [BinanceMarketDataProvider],
    },
  ],
})
export class MarketDataModule {}
