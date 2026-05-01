import {
  BadGatewayException,
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Timeframe } from '@prisma/client';
import {
  FetchHistoricalCandlesParams,
  MarketDataProvider,
  NormalizedCandle,
} from '../domain/market-data-provider.interface';

type BinanceKline = [
  number,
  string,
  string,
  string,
  string,
  string,
  number,
  string,
  number,
  string,
  string,
  string,
];

export const BINANCE_TIMEFRAME_MAP: Record<Timeframe, string> = {
  M1: '1m',
  M5: '5m',
  M15: '15m',
  M30: '30m',
  H1: '1h',
  H4: '4h',
  D1: '1d',
};

@Injectable()
export class BinanceMarketDataProvider implements MarketDataProvider {
  private readonly supportedSymbols = new Set(['BTCUSDT', 'ETHUSDT']);

  constructor(private readonly config: ConfigService) {}

  getName(): string {
    return 'BINANCE';
  }

  supportsSymbol(symbol: string): boolean {
    return this.supportedSymbols.has(symbol.toUpperCase());
  }

  async fetchHistoricalCandles(
    params: FetchHistoricalCandlesParams,
  ): Promise<NormalizedCandle[]> {
    const symbol = params.symbol.toUpperCase();
    if (!this.supportsSymbol(symbol)) {
      throw new BadRequestException(`Symbol ${params.symbol} is not supported by BINANCE`);
    }

    const interval = BINANCE_TIMEFRAME_MAP[params.timeframe];
    if (!interval) {
      throw new BadRequestException(`Timeframe ${params.timeframe} is not supported by BINANCE`);
    }

    const limit = params.limit ?? this.config.get<number>('marketData.syncDefaultLimit') ?? 1000;
    const baseUrl = this.config.get<string>('binance.apiBaseUrl') ?? 'https://api.binance.com';
    const url = new URL('/api/v3/klines', baseUrl);
    url.searchParams.set('symbol', symbol);
    url.searchParams.set('interval', interval);
    url.searchParams.set('startTime', params.startTime.getTime().toString());
    url.searchParams.set('limit', limit.toString());

    if (params.endTime) {
      url.searchParams.set('endTime', params.endTime.getTime().toString());
    }

    const response = await fetch(url);
    if (response.status === 429 || response.status === 418) {
      throw new HttpException('Binance rate limit exceeded', HttpStatus.TOO_MANY_REQUESTS);
    }
    if (!response.ok) {
      const body = await response.text();
      throw new BadGatewayException(`Binance request failed: ${response.status} ${body}`);
    }

    const klines = (await response.json()) as BinanceKline[];
    return klines.map((kline) => this.toNormalizedCandle(symbol, params.timeframe, kline));
  }

  private toNormalizedCandle(
    symbol: string,
    timeframe: Timeframe,
    kline: BinanceKline,
  ): NormalizedCandle {
    return {
      symbol,
      timeframe,
      open: Number(kline[1]),
      high: Number(kline[2]),
      low: Number(kline[3]),
      close: Number(kline[4]),
      volume: Number(kline[5]),
      timestamp: new Date(kline[0]),
      source: this.getName(),
      raw: kline,
    };
  }
}
