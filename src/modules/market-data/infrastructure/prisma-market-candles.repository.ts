import { ConflictException, Injectable } from '@nestjs/common';
import { Prisma, Timeframe } from '@prisma/client';
import { PrismaService } from '@/database/prisma.service';
import { MarketCandleEntity } from '../domain/market-candle.entity';
import {
  CreateMarketCandleData,
  FindCandlesQuery,
  MarketCandlesRepository,
} from '../domain/market-candles.repository';

@Injectable()
export class PrismaMarketCandlesRepository implements MarketCandlesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateMarketCandleData): Promise<MarketCandleEntity> {
    try {
      const candle = await this.prisma.marketCandle.create({ data });
      return this.toEntity(candle);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Candle already exists for instrument/timeframe/timestamp');
      }
      throw error;
    }
  }

  async createMany(data: CreateMarketCandleData[]): Promise<{ count: number }> {
    return this.prisma.marketCandle.createMany({ data, skipDuplicates: true });
  }

  async upsertManyCandles(data: CreateMarketCandleData[]): Promise<{ insertedCount: number }> {
    const result = await this.prisma.marketCandle.createMany({ data, skipDuplicates: true });
    return { insertedCount: result.count };
  }

  async findMany(query: FindCandlesQuery): Promise<MarketCandleEntity[]> {
    const candles = await this.prisma.marketCandle.findMany({
      where: {
        instrumentId: query.instrumentId,
        timeframe: query.timeframe,
        timestamp: {
          gte: query.from,
          lte: query.to,
        },
      },
      orderBy: { timestamp: query.order ?? 'asc' },
      take: query.limit,
    });
    return candles.map((candle) => this.toEntity(candle));
  }

  private toEntity(candle: {
    id: string;
    instrumentId: string;
    timeframe: Timeframe;
    open: Prisma.Decimal;
    high: Prisma.Decimal;
    low: Prisma.Decimal;
    close: Prisma.Decimal;
    volume: Prisma.Decimal;
    timestamp: Date;
    source: string;
    createdAt: Date;
  }) {
    return new MarketCandleEntity(
      candle.id,
      candle.instrumentId,
      candle.timeframe,
      candle.open.toNumber(),
      candle.high.toNumber(),
      candle.low.toNumber(),
      candle.close.toNumber(),
      candle.volume.toNumber(),
      candle.timestamp,
      candle.source,
      candle.createdAt,
    );
  }
}
