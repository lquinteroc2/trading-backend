import { Module } from '@nestjs/common';
import { TOKENS } from '@/shared/tokens';
import { MarketDataService } from './application/market-data.service';
import { PrismaMarketCandlesRepository } from './infrastructure/prisma-market-candles.repository';
import { MarketDataController } from './presentation/market-data.controller';

@Module({
  controllers: [MarketDataController],
  providers: [
    MarketDataService,
    { provide: TOKENS.MARKET_CANDLES_REPOSITORY, useClass: PrismaMarketCandlesRepository },
  ],
})
export class MarketDataModule {}
