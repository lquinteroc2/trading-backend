import { ConflictException, Injectable } from '@nestjs/common';
import { Prisma, SignalDirection, SignalStatus, SourceAgent, Timeframe } from '@prisma/client';
import { PrismaService } from '@/database/prisma.service';
import { TradingSignalEntity } from '../domain/trading-signal.entity';
import {
  CreateTradingSignalData,
  FindSignalsQuery,
  SignalCandleKey,
  TradingSignalsRepository,
} from '../domain/trading-signals.repository';

@Injectable()
export class PrismaSignalsRepository implements TradingSignalsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateTradingSignalData): Promise<TradingSignalEntity> {
    try {
      return this.toEntity(await this.prisma.tradingSignal.create({ data }));
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Signal already exists for instrument/timeframe/candle');
      }
      throw error;
    }
  }

  async findMany(query: FindSignalsQuery): Promise<TradingSignalEntity[]> {
    const signals = await this.prisma.tradingSignal.findMany({
      where: {
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
    return signals.map((signal) => this.toEntity(signal));
  }

  async findById(id: string): Promise<TradingSignalEntity | null> {
    const signal = await this.prisma.tradingSignal.findUnique({ where: { id } });
    return signal ? this.toEntity(signal) : null;
  }

  async findByCandleKey(key: SignalCandleKey): Promise<TradingSignalEntity | null> {
    const signal = await this.prisma.tradingSignal.findUnique({
      where: {
        instrumentId_timeframe_candleTimestamp: key,
      },
    });
    return signal ? this.toEntity(signal) : null;
  }

  async updateStatus(id: string, status: SignalStatus): Promise<TradingSignalEntity> {
    return this.toEntity(await this.prisma.tradingSignal.update({ where: { id }, data: { status } }));
  }

  private toEntity(signal: {
    id: string;
    instrumentId: string;
    strategyId: string | null;
    timeframe: Timeframe | null;
    direction: SignalDirection;
    entryPrice: Prisma.Decimal;
    stopLoss: Prisma.Decimal | null;
    takeProfit: Prisma.Decimal | null;
    confidenceScore: number;
    status: SignalStatus;
    sourceAgent: SourceAgent;
    candleTimestamp: Date | null;
    reason: string | null;
    reasoning: string | null;
    createdAt: Date;
    expiresAt: Date | null;
  }) {
    return new TradingSignalEntity(
      signal.id,
      signal.instrumentId,
      signal.strategyId,
      signal.timeframe,
      signal.direction,
      signal.entryPrice.toNumber(),
      signal.stopLoss?.toNumber() ?? null,
      signal.takeProfit?.toNumber() ?? null,
      signal.confidenceScore,
      signal.status,
      signal.sourceAgent,
      signal.candleTimestamp,
      signal.reason,
      signal.reasoning,
      signal.createdAt,
      signal.expiresAt,
    );
  }
}
