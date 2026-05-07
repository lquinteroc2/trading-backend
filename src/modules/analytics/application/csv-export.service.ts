import { Injectable } from '@nestjs/common';
import { AnalyticsFilters, GroupedTradingMetrics } from '../domain/analytics.types';
import { AnalyticsService } from './analytics.service';

export type AnalyticsCsvType = 'trades' | 'daily' | 'weekly' | 'strategy' | 'symbol';

@Injectable()
export class CsvExportService {
  constructor(private readonly analytics: AnalyticsService) {}

  async export(type: AnalyticsCsvType, filters: AnalyticsFilters) {
    if (type === 'trades') {
      const trades = await this.analytics.trades(filters);
      return this.toCsv(
        [
          'id',
          'executionType',
          'symbol',
          'strategyId',
          'timeframe',
          'direction',
          'entryPrice',
          'exitPrice',
          'positionSize',
          'pnl',
          'openedAt',
          'closedAt',
        ],
        trades.map((trade) => [
          trade.id,
          trade.executionType,
          trade.symbol ?? '',
          trade.strategyId ?? '',
          trade.timeframe ?? '',
          trade.direction,
          trade.entryPrice,
          trade.exitPrice ?? '',
          trade.positionSize,
          trade.pnl,
          trade.openedAt.toISOString(),
          trade.closedAt?.toISOString() ?? '',
        ]),
      );
    }

    const groupBy = type === 'daily' ? 'DAY' : type === 'weekly' ? 'WEEK' : type === 'strategy' ? 'STRATEGY' : 'SYMBOL';
    const groups = await this.analytics.grouped(filters, groupBy);
    return this.groupedCsv(groups);
  }

  private groupedCsv(groups: GroupedTradingMetrics[]) {
    return this.toCsv(
      [
        'key',
        'totalTrades',
        'winningTrades',
        'losingTrades',
        'winRate',
        'profitFactor',
        'netPnL',
        'maxDrawdown',
        'expectancy',
      ],
      groups.map((group) => [
        group.key,
        group.metrics.totalTrades,
        group.metrics.winningTrades,
        group.metrics.losingTrades,
        group.metrics.winRate,
        group.metrics.profitFactor,
        group.metrics.netPnL,
        group.metrics.maxDrawdown,
        group.metrics.expectancy,
      ]),
    );
  }

  private toCsv(headers: string[], rows: Array<Array<string | number>>) {
    return [headers, ...rows].map((row) => row.map((value) => this.escape(value)).join(',')).join('\n');
  }

  private escape(value: string | number) {
    const stringValue = String(value);
    if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
      return `"${stringValue.replace(/"/g, '""')}"`;
    }
    return stringValue;
  }
}
