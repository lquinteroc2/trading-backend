import { Injectable } from '@nestjs/common';
import {
  BacktestStatus,
  BacktestTradeResult,
  Prisma,
  Timeframe,
  TradeDirection,
} from '@prisma/client';
import { PrismaService } from '@/database/prisma.service';
import { BacktestRunEntity } from '../domain/backtest-run.entity';
import { BacktestTradeEntity } from '../domain/backtest-trade.entity';
import {
  BacktestMetricsData,
  BacktestRunsRepository,
  CreateBacktestRunData,
  CreateBacktestTradeData,
  FindBacktestRunsQuery,
} from '../domain/backtest-runs.repository';

@Injectable()
export class PrismaBacktestRunsRepository implements BacktestRunsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createRun(data: CreateBacktestRunData): Promise<BacktestRunEntity> {
    const run = await this.prisma.backtestRun.create({ data });
    return this.toRunEntity(run);
  }

  async completeRun(id: string, metrics: BacktestMetricsData): Promise<BacktestRunEntity> {
    const run = await this.prisma.backtestRun.update({
      where: { id },
      data: {
        ...metrics,
        filterReasons: metrics.filterReasons as Prisma.InputJsonValue,
        status: BacktestStatus.COMPLETED,
        finishedAt: new Date(),
      },
    });
    return this.toRunEntity(run);
  }

  async failRun(id: string, errorMessage: string): Promise<BacktestRunEntity> {
    const run = await this.prisma.backtestRun.update({
      where: { id },
      data: {
        status: BacktestStatus.FAILED,
        errorMessage,
        finishedAt: new Date(),
      },
    });
    return this.toRunEntity(run);
  }

  async findRuns(query: FindBacktestRunsQuery): Promise<BacktestRunEntity[]> {
    const runs = await this.prisma.backtestRun.findMany({
      where: {
        instrumentId: query.instrumentId,
        strategyId: query.strategyId,
        status: query.status,
      },
      orderBy: { createdAt: 'desc' },
      take: query.limit ?? 50,
    });
    return runs.map((run) => this.toRunEntity(run));
  }

  async findRunById(id: string): Promise<BacktestRunEntity | null> {
    const run = await this.prisma.backtestRun.findUnique({ where: { id } });
    return run ? this.toRunEntity(run) : null;
  }

  async createTrades(data: CreateBacktestTradeData[]): Promise<{ count: number }> {
    if (data.length === 0) {
      return { count: 0 };
    }
    return this.prisma.backtestTrade.createMany({ data });
  }

  async findTradesByRunId(backtestRunId: string): Promise<BacktestTradeEntity[]> {
    const trades = await this.prisma.backtestTrade.findMany({
      where: { backtestRunId },
      orderBy: { openedAt: 'asc' },
    });
    return trades.map((trade) => this.toTradeEntity(trade));
  }

  private toRunEntity(run: {
    id: string;
    strategyId: string;
    strategyVersionId: string | null;
    instrumentId: string;
    timeframe: Timeframe;
    startDate: Date;
    endDate: Date;
    initialBalance: Prisma.Decimal;
    finalBalance: Prisma.Decimal | null;
    totalTrades: number;
    winningTrades: number;
    losingTrades: number;
    winRate: Prisma.Decimal | null;
    grossProfit: Prisma.Decimal;
    grossLoss: Prisma.Decimal;
    profitFactor: Prisma.Decimal | null;
    maxDrawdown: Prisma.Decimal | null;
    netPnL: Prisma.Decimal;
    averageWin: Prisma.Decimal | null;
    averageLoss: Prisma.Decimal | null;
    signalsBeforeFilters: number;
    signalsAfterFilters: number;
    filteredSignals: number;
    filterReasons: Prisma.JsonValue | null;
    status: BacktestStatus;
    errorMessage: string | null;
    createdAt: Date;
    finishedAt: Date | null;
  }) {
    return new BacktestRunEntity(
      run.id,
      run.strategyId,
      run.strategyVersionId,
      run.instrumentId,
      run.timeframe,
      run.startDate,
      run.endDate,
      run.initialBalance.toNumber(),
      run.finalBalance?.toNumber() ?? null,
      run.totalTrades,
      run.winningTrades,
      run.losingTrades,
      run.winRate?.toNumber() ?? null,
      run.grossProfit.toNumber(),
      run.grossLoss.toNumber(),
      run.profitFactor?.toNumber() ?? null,
      run.maxDrawdown?.toNumber() ?? null,
      run.netPnL.toNumber(),
      run.averageWin?.toNumber() ?? null,
      run.averageLoss?.toNumber() ?? null,
      run.signalsBeforeFilters,
      run.signalsAfterFilters,
      run.filteredSignals,
      run.filterReasons,
      run.status,
      run.errorMessage,
      run.createdAt,
      run.finishedAt,
    );
  }

  private toTradeEntity(trade: {
    id: string;
    backtestRunId: string;
    signalId: string | null;
    direction: TradeDirection;
    entryPrice: Prisma.Decimal;
    stopLoss: Prisma.Decimal;
    takeProfit: Prisma.Decimal;
    positionSize: Prisma.Decimal;
    openedAt: Date;
    closedAt: Date | null;
    exitPrice: Prisma.Decimal | null;
    pnl: Prisma.Decimal | null;
    pnlPercent: Prisma.Decimal | null;
    result: BacktestTradeResult | null;
  }) {
    return new BacktestTradeEntity(
      trade.id,
      trade.backtestRunId,
      trade.signalId,
      trade.direction,
      trade.entryPrice.toNumber(),
      trade.stopLoss.toNumber(),
      trade.takeProfit.toNumber(),
      trade.positionSize.toNumber(),
      trade.openedAt,
      trade.closedAt,
      trade.exitPrice?.toNumber() ?? null,
      trade.pnl?.toNumber() ?? null,
      trade.pnlPercent?.toNumber() ?? null,
      trade.result,
    );
  }
}
