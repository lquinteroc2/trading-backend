import { AnalyticsExecutionType, Timeframe, TradeDirection } from '@prisma/client';
import { AnalyticsService } from '@/modules/analytics/application/analytics.service';
import { MetricsCalculatorService } from '@/modules/analytics/application/metrics-calculator.service';
import { AnalyticsTrade } from '@/modules/analytics/domain/analytics.types';

function makeTrade(overrides: Partial<AnalyticsTrade>): AnalyticsTrade {
  return {
    id: overrides.id ?? 'trade-1',
    executionType: overrides.executionType ?? AnalyticsExecutionType.PAPER_TRADING,
    instrumentId: overrides.instrumentId ?? 'instrument-1',
    symbol: overrides.symbol ?? 'XAUUSD',
    strategyId: overrides.strategyId ?? 'strategy-1',
    timeframe: overrides.timeframe ?? Timeframe.M15,
    direction: overrides.direction ?? TradeDirection.BUY,
    entryPrice: overrides.entryPrice ?? 100,
    exitPrice: overrides.exitPrice ?? 110,
    positionSize: overrides.positionSize ?? 1,
    pnl: overrides.pnl ?? 10,
    openedAt: overrides.openedAt ?? new Date('2026-01-01T00:00:00.000Z'),
    closedAt: overrides.closedAt ?? new Date('2026-01-01T01:00:00.000Z'),
  };
}

describe('AnalyticsService', () => {
  function makeService(trades: AnalyticsTrade[]) {
    const source = {
      getTrades: jest.fn(async () => trades),
      getEquityCurve: jest.fn(async () => [{ date: '2026-01-01', balance: 10, equity: 10, pnl: 10 }]),
    };
    return {
      service: new AnalyticsService(source as never, new MetricsCalculatorService()),
      source,
    };
  }

  it('passes executionType filter to source', async () => {
    const { service, source } = makeService([makeTrade({})]);

    await service.summary({ executionType: AnalyticsExecutionType.BACKTEST });

    expect(source.getTrades).toHaveBeenCalledWith(
      expect.objectContaining({ executionType: AnalyticsExecutionType.BACKTEST }),
    );
  });

  it('groups by day', async () => {
    const { service } = makeService([
      makeTrade({ id: '1', pnl: 10, closedAt: new Date('2026-01-01T01:00:00.000Z') }),
      makeTrade({ id: '2', pnl: -5, closedAt: new Date('2026-01-01T02:00:00.000Z') }),
      makeTrade({ id: '3', pnl: 20, closedAt: new Date('2026-01-02T01:00:00.000Z') }),
    ]);

    const groups = await service.grouped({}, 'DAY');

    expect(groups).toHaveLength(2);
    expect(groups[0]).toEqual(expect.objectContaining({ key: '2026-01-01' }));
    expect(groups[0].metrics.netPnL).toBe(5);
  });

  it('groups by strategy', async () => {
    const { service } = makeService([
      makeTrade({ id: '1', strategyId: 'ema', pnl: 10 }),
      makeTrade({ id: '2', strategyId: 'rsi', pnl: -5 }),
    ]);

    const groups = await service.grouped({}, 'STRATEGY');

    expect(groups.map((group) => group.key)).toEqual(['ema', 'rsi']);
  });

  it('groups by symbol', async () => {
    const { service } = makeService([
      makeTrade({ id: '1', symbol: 'BTCUSDT', pnl: 10 }),
      makeTrade({ id: '2', symbol: 'XAUUSD', pnl: -5 }),
    ]);

    const groups = await service.grouped({}, 'SYMBOL');

    expect(groups.map((group) => group.key)).toEqual(['BTCUSDT', 'XAUUSD']);
  });
});
