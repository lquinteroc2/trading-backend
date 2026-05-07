import { Injectable } from '@nestjs/common';
import { AnalyticsExecutionType } from '@prisma/client';
import {
  AnalyticsFilters,
  AnalyticsGroupBy,
  AnalyticsTrade,
  GroupedTradingMetrics,
} from '../domain/analytics.types';
import { PrismaTradeAnalyticsSource } from '../infrastructure/prisma-trade-analytics.source';
import { MetricsCalculatorService } from './metrics-calculator.service';

@Injectable()
export class AnalyticsService {
  constructor(
    private readonly source: PrismaTradeAnalyticsSource,
    private readonly calculator: MetricsCalculatorService,
  ) {}

  async summary(filters: AnalyticsFilters) {
    const executionType = filters.executionType ?? AnalyticsExecutionType.PAPER_TRADING;
    const resolvedFilters = { ...filters, executionType };
    return {
      executionType,
      from: filters.from?.toISOString() ?? null,
      to: filters.to?.toISOString() ?? null,
      metrics: this.calculator.calculate(await this.source.getTrades(resolvedFilters)),
    };
  }

  async grouped(filters: AnalyticsFilters, groupBy: AnalyticsGroupBy): Promise<GroupedTradingMetrics[]> {
    const trades = await this.source.getTrades({
      ...filters,
      executionType: filters.executionType ?? AnalyticsExecutionType.PAPER_TRADING,
    });
    const groups = new Map<string, AnalyticsTrade[]>();
    for (const trade of trades) {
      const key = this.groupKey(trade, groupBy);
      groups.set(key, [...(groups.get(key) ?? []), trade]);
    }
    return [...groups.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, groupedTrades]) => ({ key, metrics: this.calculator.calculate(groupedTrades) }));
  }

  async equityCurve(filters: AnalyticsFilters) {
    return {
      points: await this.source.getEquityCurve({
        ...filters,
        executionType: filters.executionType ?? AnalyticsExecutionType.PAPER_TRADING,
      }),
    };
  }

  async trades(filters: AnalyticsFilters) {
    return this.source.getTrades({
      ...filters,
      executionType: filters.executionType ?? AnalyticsExecutionType.PAPER_TRADING,
    });
  }

  private groupKey(trade: AnalyticsTrade, groupBy: AnalyticsGroupBy) {
    if (groupBy === 'DAY') {
      return this.toDateKey(trade.closedAt ?? trade.openedAt);
    }
    if (groupBy === 'WEEK') {
      return this.toWeekKey(trade.closedAt ?? trade.openedAt);
    }
    if (groupBy === 'STRATEGY') {
      return trade.strategyId ?? 'NO_STRATEGY';
    }
    if (groupBy === 'SYMBOL') {
      return trade.symbol ?? 'UNKNOWN_SYMBOL';
    }
    return trade.timeframe ?? 'NO_TIMEFRAME';
  }

  private toDateKey(date: Date) {
    return date.toISOString().slice(0, 10);
  }

  private toWeekKey(date: Date) {
    const value = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
    const day = value.getUTCDay() || 7;
    value.setUTCDate(value.getUTCDate() + 4 - day);
    const yearStart = new Date(Date.UTC(value.getUTCFullYear(), 0, 1));
    const week = Math.ceil(((value.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
    return `${value.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
  }
}
