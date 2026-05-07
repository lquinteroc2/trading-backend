import { AnalyticsExecutionType, TradeDirection } from '@prisma/client';
import { MetricsCalculatorService } from '@/modules/analytics/application/metrics-calculator.service';
import { AnalyticsTrade } from '@/modules/analytics/domain/analytics.types';

function trade(id: string, pnl: number): AnalyticsTrade {
  return {
    id,
    executionType: AnalyticsExecutionType.PAPER_TRADING,
    direction: TradeDirection.BUY,
    entryPrice: 100,
    exitPrice: 100 + pnl,
    positionSize: 1,
    pnl,
    openedAt: new Date(`2026-01-0${id}T00:00:00.000Z`),
    closedAt: new Date(`2026-01-0${id}T01:00:00.000Z`),
  };
}

describe('MetricsCalculatorService', () => {
  const calculator = new MetricsCalculatorService();

  it('calculates winRate and netPnL correctly', () => {
    const metrics = calculator.calculate([trade('1', 100), trade('2', -50), trade('3', 0)]);

    expect(metrics.totalTrades).toBe(3);
    expect(metrics.winningTrades).toBe(1);
    expect(metrics.losingTrades).toBe(1);
    expect(metrics.breakevenTrades).toBe(1);
    expect(metrics.winRate).toBe(0.333333);
    expect(metrics.netPnL).toBe(50);
  });

  it('calculates profitFactor correctly', () => {
    const metrics = calculator.calculate([trade('1', 100), trade('2', 50), trade('3', -75)]);

    expect(metrics.grossProfit).toBe(150);
    expect(metrics.grossLoss).toBe(-75);
    expect(metrics.profitFactor).toBe(2);
  });

  it('calculates expectancy correctly', () => {
    const metrics = calculator.calculate([
      trade('1', 100),
      trade('2', 50),
      trade('3', -50),
      trade('4', -50),
    ]);

    expect(metrics.expectancy).toBe(12.5);
  });

  it('calculates maxDrawdown correctly', () => {
    const metrics = calculator.calculate([trade('1', 100), trade('2', -40), trade('3', -80), trade('4', 30)]);

    expect(metrics.maxDrawdown).toBe(120);
  });
});
