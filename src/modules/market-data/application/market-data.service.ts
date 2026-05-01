import { Inject, Injectable } from '@nestjs/common';
import { TOKENS } from '@/shared/tokens';
import {
  CreateMarketCandleData,
  FindCandlesQuery,
  MarketCandlesRepository,
} from '../domain/market-candles.repository';

@Injectable()
export class MarketDataService {
  constructor(
    @Inject(TOKENS.MARKET_CANDLES_REPOSITORY)
    private readonly candlesRepository: MarketCandlesRepository,
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
}
