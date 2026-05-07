import { Injectable } from '@nestjs/common';
import {
  AnalyticsExecutionType,
  BacktestTradeResult,
  LiveTradeStatus,
  PaperTradeStatus,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '@/database/prisma.service';
import {
  AnalyticsFilters,
  AnalyticsTrade,
  EquityCurvePoint,
  TradeAnalyticsSource,
} from '../domain/analytics.types';
import { MetricsCalculatorService } from '../application/metrics-calculator.service';

@Injectable()
export class PrismaTradeAnalyticsSource implements TradeAnalyticsSource {
  constructor(
    private readonly prisma: PrismaService,
    private readonly calculator: MetricsCalculatorService,
  ) {}

  async getTrades(filters: AnalyticsFilters): Promise<AnalyticsTrade[]> {
    if (filters.executionType === AnalyticsExecutionType.BACKTEST) {
      return this.getBacktestTrades(filters);
    }
    if (filters.executionType === AnalyticsExecutionType.LIVE_LIMITED) {
      return this.getLiveTrades(filters);
    }
    return this.getPaperTrades(filters);
  }

  async getEquityCurve(filters: AnalyticsFilters): Promise<EquityCurvePoint[]> {
    return this.calculator.equityCurve(await this.getTrades(filters));
  }

  private async getPaperTrades(filters: AnalyticsFilters): Promise<AnalyticsTrade[]> {
    const trades = await this.prisma.paperTrade.findMany({
      where: {
        status: PaperTradeStatus.CLOSED,
        instrumentId: filters.instrumentId,
        instrument: filters.symbol ? { symbol: filters.symbol } : undefined,
        signal: {
          strategyId: filters.strategyId,
          timeframe: filters.timeframe,
        },
        closedAt: {
          gte: filters.from,
          lte: filters.to,
        },
      },
      include: { instrument: true, signal: true },
      orderBy: [{ closedAt: 'asc' }, { openedAt: 'asc' }],
    });
    return trades
      .filter((trade) => trade.pnl !== null)
      .map((trade) => ({
        id: trade.id,
        executionType: AnalyticsExecutionType.PAPER_TRADING,
        instrumentId: trade.instrumentId,
        symbol: trade.instrument.symbol,
        strategyId: trade.signal?.strategyId ?? null,
        timeframe: trade.signal?.timeframe ?? null,
        direction: trade.direction,
        entryPrice: trade.entryPrice.toNumber(),
        exitPrice: trade.closePrice?.toNumber() ?? null,
        positionSize: trade.positionSize.toNumber(),
        pnl: trade.pnl?.toNumber() ?? 0,
        openedAt: trade.openedAt,
        closedAt: trade.closedAt,
      }));
  }

  private async getBacktestTrades(filters: AnalyticsFilters): Promise<AnalyticsTrade[]> {
    const trades = await this.prisma.backtestTrade.findMany({
      where: {
        backtestRun: {
          instrumentId: filters.instrumentId,
          strategyId: filters.strategyId,
          timeframe: filters.timeframe,
          instrument: filters.symbol ? { symbol: filters.symbol } : undefined,
        },
        closedAt: {
          gte: filters.from,
          lte: filters.to,
        },
      },
      include: { backtestRun: { include: { instrument: true } } },
      orderBy: [{ closedAt: 'asc' }, { openedAt: 'asc' }],
    });
    return trades
      .filter((trade) => trade.pnl !== null)
      .map((trade) => ({
        id: trade.id,
        executionType: AnalyticsExecutionType.BACKTEST,
        instrumentId: trade.backtestRun.instrumentId,
        symbol: trade.backtestRun.instrument.symbol,
        strategyId: trade.backtestRun.strategyId,
        timeframe: trade.backtestRun.timeframe,
        direction: trade.direction,
        entryPrice: trade.entryPrice.toNumber(),
        exitPrice: trade.exitPrice?.toNumber() ?? null,
        positionSize: trade.positionSize.toNumber(),
        pnl: trade.pnl?.toNumber() ?? 0,
        riskRewardRatio: this.resultToRiskReward(trade.result),
        openedAt: trade.openedAt,
        closedAt: trade.closedAt,
      }));
  }

  private async getLiveTrades(filters: AnalyticsFilters): Promise<AnalyticsTrade[]> {
    const trades = await this.prisma.liveTrade.findMany({
      where: {
        status: { in: [LiveTradeStatus.CLOSED, LiveTradeStatus.EXECUTED] },
        signal: {
          instrumentId: filters.instrumentId,
          strategyId: filters.strategyId,
          timeframe: filters.timeframe,
          instrument: filters.symbol ? { symbol: filters.symbol } : undefined,
        },
        createdAt: {
          gte: filters.from,
          lte: filters.to,
        },
      },
      include: { signal: { include: { instrument: true } } },
      orderBy: [{ closedAt: 'asc' }, { openedAt: 'asc' }, { createdAt: 'asc' }],
    });
    return trades
      .map((trade) => ({
        id: trade.id,
        executionType: AnalyticsExecutionType.LIVE_LIMITED,
        instrumentId: trade.signal.instrumentId,
        symbol: trade.symbol || trade.signal.instrument.symbol,
        strategyId: trade.signal.strategyId,
        timeframe: trade.signal.timeframe,
        direction: trade.direction,
        entryPrice: trade.entryPrice.toNumber(),
        exitPrice: this.readNumberFromJson(trade.responsePayload, 'exitPrice'),
        positionSize: trade.volume.toNumber(),
        pnl: this.readNumberFromJson(trade.responsePayload, 'pnl') ?? 0,
        openedAt: trade.openedAt ?? trade.createdAt,
        closedAt: trade.closedAt,
      }))
      .filter((trade) => trade.pnl !== 0 || trades.find((sourceTrade) => sourceTrade.id === trade.id)?.closedAt);
  }

  private resultToRiskReward(result: BacktestTradeResult | null) {
    if (result === BacktestTradeResult.WIN) {
      return 1;
    }
    if (result === BacktestTradeResult.LOSS) {
      return -1;
    }
    return 0;
  }

  private readNumberFromJson(value: Prisma.JsonValue | null, key: string): number | null {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return null;
    }
    const candidate = (value as Record<string, unknown>)[key];
    return typeof candidate === 'number' && Number.isFinite(candidate) ? candidate : null;
  }
}
