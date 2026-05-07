import { AnalyticsExecutionType } from '@prisma/client';
import { AnalyticsController } from '@/modules/analytics/presentation/analytics.controller';

describe('AnalyticsController', () => {
  it('returns summary structure', async () => {
    const analytics = {
      summary: jest.fn(async () => ({
        executionType: AnalyticsExecutionType.PAPER_TRADING,
        from: null,
        to: null,
        metrics: { totalTrades: 0 },
      })),
      grouped: jest.fn(),
      equityCurve: jest.fn(),
    };
    const csv = { export: jest.fn() };
    const controller = new AnalyticsController(analytics as never, csv as never);

    const response = await controller.summary({ executionType: AnalyticsExecutionType.PAPER_TRADING });

    expect(response).toEqual({
      executionType: AnalyticsExecutionType.PAPER_TRADING,
      from: null,
      to: null,
      metrics: { totalTrades: 0 },
    });
    expect(analytics.summary).toHaveBeenCalledWith(
      expect.objectContaining({ executionType: AnalyticsExecutionType.PAPER_TRADING }),
    );
  });

  it('maps daily endpoint to DAY grouping', async () => {
    const analytics = {
      summary: jest.fn(),
      grouped: jest.fn(async () => []),
      equityCurve: jest.fn(),
    };
    const csv = { export: jest.fn() };
    const controller = new AnalyticsController(analytics as never, csv as never);

    await controller.daily({});

    expect(analytics.grouped).toHaveBeenCalledWith(expect.any(Object), 'DAY');
  });
});
