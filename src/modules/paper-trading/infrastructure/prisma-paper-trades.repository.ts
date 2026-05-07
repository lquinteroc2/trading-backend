import { Injectable } from '@nestjs/common';
import {
  PaperTradeCloseReason,
  PaperTradeResult,
  PaperTradeStatus,
  Prisma,
  TradeDirection,
} from '@prisma/client';
import { PrismaService } from '@/database/prisma.service';
import { PaperTradeEntity } from '../domain/paper-trade.entity';
import {
  ClosePaperTradeData,
  CreatePaperTradeData,
  FindPaperTradesQuery,
  PaperTradesRepository,
} from '../domain/paper-trades.repository';

@Injectable()
export class PrismaPaperTradesRepository implements PaperTradesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreatePaperTradeData): Promise<PaperTradeEntity> {
    return this.toEntity(await this.prisma.paperTrade.create({ data }));
  }

  async findMany(query: FindPaperTradesQuery = {}): Promise<PaperTradeEntity[]> {
    const trades = await this.prisma.paperTrade.findMany({
      where: {
        accountId: query.accountId,
        instrumentId: query.instrumentId,
        status: query.status,
        result: query.result,
        openedAt: {
          gte: query.from,
          lte: query.to,
        },
      },
      orderBy: { openedAt: 'desc' },
      take: query.limit ?? 200,
    });
    return trades.map((trade) => this.toEntity(trade));
  }

  async findById(id: string): Promise<PaperTradeEntity | null> {
    const trade = await this.prisma.paperTrade.findUnique({ where: { id } });
    return trade ? this.toEntity(trade) : null;
  }

  async findOpenByInstrument(instrumentId: string): Promise<PaperTradeEntity | null> {
    const trade = await this.prisma.paperTrade.findFirst({
      where: { instrumentId, status: PaperTradeStatus.OPEN },
      orderBy: { openedAt: 'desc' },
    });
    return trade ? this.toEntity(trade) : null;
  }

  async findOpenByAccount(accountId: string): Promise<PaperTradeEntity[]> {
    const trades = await this.prisma.paperTrade.findMany({
      where: { accountId, status: PaperTradeStatus.OPEN },
      orderBy: { openedAt: 'desc' },
    });
    return trades.map((trade) => this.toEntity(trade));
  }

  async findBySignalId(signalId: string): Promise<PaperTradeEntity | null> {
    const trade = await this.prisma.paperTrade.findUnique({ where: { signalId } });
    return trade ? this.toEntity(trade) : null;
  }

  async close(id: string, data: ClosePaperTradeData): Promise<PaperTradeEntity> {
    return this.toEntity(await this.prisma.paperTrade.update({ where: { id }, data }));
  }

  private toEntity(trade: {
    id: string;
    accountId: string;
    signalId: string | null;
    instrumentId: string;
    direction: TradeDirection;
    entryPrice: Prisma.Decimal;
    stopLoss: Prisma.Decimal | null;
    takeProfit: Prisma.Decimal | null;
    positionSize: Prisma.Decimal;
    status: PaperTradeStatus;
    openedAt: Date;
    closedAt: Date | null;
    closePrice: Prisma.Decimal | null;
    pnl: Prisma.Decimal | null;
    pnlPercent: Prisma.Decimal | null;
    result: PaperTradeResult;
    closeReason: PaperTradeCloseReason | null;
  }) {
    return new PaperTradeEntity(
      trade.id,
      trade.accountId,
      trade.signalId,
      trade.instrumentId,
      trade.direction,
      trade.entryPrice.toNumber(),
      trade.stopLoss?.toNumber() ?? null,
      trade.takeProfit?.toNumber() ?? null,
      trade.positionSize.toNumber(),
      trade.status,
      trade.openedAt,
      trade.closedAt,
      trade.closePrice?.toNumber() ?? null,
      trade.pnl?.toNumber() ?? null,
      trade.pnlPercent?.toNumber() ?? null,
      trade.result,
      trade.closeReason,
    );
  }
}
