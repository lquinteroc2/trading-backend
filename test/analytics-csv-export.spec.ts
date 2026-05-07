import { AnalyticsExecutionType, TradeDirection } from '@prisma/client';
import { CsvExportService } from '@/modules/analytics/application/csv-export.service';

describe('CsvExportService', () => {
  it('generates trade headers and rows', async () => {
    const analytics = {
      trades: jest.fn(async () => [
        {
          id: 'trade-1',
          executionType: AnalyticsExecutionType.PAPER_TRADING,
          symbol: 'XAUUSD',
          strategyId: 'strategy-1',
          timeframe: 'M15',
          direction: TradeDirection.BUY,
          entryPrice: 100,
          exitPrice: 110,
          positionSize: 1,
          pnl: 10,
          openedAt: new Date('2026-01-01T00:00:00.000Z'),
          closedAt: new Date('2026-01-01T01:00:00.000Z'),
        },
      ]),
    };
    const service = new CsvExportService(analytics as never);

    const csv = await service.export('trades', {});

    expect(csv.split('\n')[0]).toBe(
      'id,executionType,symbol,strategyId,timeframe,direction,entryPrice,exitPrice,positionSize,pnl,openedAt,closedAt',
    );
    expect(csv).toContain('trade-1,PAPER_TRADING,XAUUSD,strategy-1,M15,BUY,100,110,1,10');
  });

  it('generates grouped metric rows', async () => {
    const analytics = {
      grouped: jest.fn(async () => [
        {
          key: '2026-01-01',
          metrics: {
            totalTrades: 1,
            winningTrades: 1,
            losingTrades: 0,
            winRate: 1,
            profitFactor: 10,
            netPnL: 25,
            maxDrawdown: 0,
            expectancy: 25,
          },
        },
      ]),
    };
    const service = new CsvExportService(analytics as never);

    const csv = await service.export('daily', {});

    expect(csv.split('\n')[0]).toBe(
      'key,totalTrades,winningTrades,losingTrades,winRate,profitFactor,netPnL,maxDrawdown,expectancy',
    );
    expect(csv).toContain('2026-01-01,1,1,0,1,10,25,0,25');
  });
});
