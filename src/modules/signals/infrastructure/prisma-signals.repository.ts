import { Injectable } from '@nestjs/common';
import { Prisma, SignalDirection, SignalStatus, SourceAgent } from '@prisma/client';
import { PrismaService } from '@/database/prisma.service';
import { TradingSignalEntity } from '../domain/trading-signal.entity';
import {
  CreateTradingSignalData,
  FindSignalsQuery,
  TradingSignalsRepository,
} from '../domain/trading-signals.repository';

@Injectable()
export class PrismaSignalsRepository implements TradingSignalsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateTradingSignalData): Promise<TradingSignalEntity> {
    return this.toEntity(await this.prisma.tradingSignal.create({ data }));
  }

  async findMany(query: FindSignalsQuery): Promise<TradingSignalEntity[]> {
    const signals = await this.prisma.tradingSignal.findMany({
      where: { instrumentId: query.instrumentId, status: query.status },
      orderBy: { createdAt: 'desc' },
    });
    return signals.map((signal) => this.toEntity(signal));
  }

  async findById(id: string): Promise<TradingSignalEntity | null> {
    const signal = await this.prisma.tradingSignal.findUnique({ where: { id } });
    return signal ? this.toEntity(signal) : null;
  }

  async updateStatus(id: string, status: SignalStatus): Promise<TradingSignalEntity> {
    return this.toEntity(await this.prisma.tradingSignal.update({ where: { id }, data: { status } }));
  }

  private toEntity(signal: {
    id: string;
    instrumentId: string;
    direction: SignalDirection;
    entryPrice: Prisma.Decimal;
    stopLoss: Prisma.Decimal | null;
    takeProfit: Prisma.Decimal | null;
    confidenceScore: number;
    status: SignalStatus;
    sourceAgent: SourceAgent;
    reasoning: string | null;
    createdAt: Date;
    expiresAt: Date | null;
  }) {
    return new TradingSignalEntity(
      signal.id,
      signal.instrumentId,
      signal.direction,
      signal.entryPrice.toNumber(),
      signal.stopLoss?.toNumber() ?? null,
      signal.takeProfit?.toNumber() ?? null,
      signal.confidenceScore,
      signal.status,
      signal.sourceAgent,
      signal.reasoning,
      signal.createdAt,
      signal.expiresAt,
    );
  }
}
