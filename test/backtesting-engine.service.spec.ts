import { SignalDirection, Timeframe } from '@prisma/client';
import { MarketCandleEntity } from '@/modules/market-data/domain/market-candle.entity';
import { StrategyEngineService } from '@/modules/strategies/application/strategy-engine.service';
import { StrategyEntity } from '@/modules/strategies/domain/strategy.entity';
import { BacktestingEngineService } from '@/modules/backtesting/application/backtesting-engine.service';
import { BacktestingIndicatorsService } from '@/modules/backtesting/application/backtesting-indicators.service';
import { BacktestingMetricsService } from '@/modules/backtesting/application/backtesting-metrics.service';

describe('BacktestingEngineService', () => {
  const strategy = new StrategyEntity(
    'strategy-id',
    'EMA_TREND_STRATEGY',
    'Test strategy',
    'ACTIVE',
    new Date('2024-01-01T00:00:00.000Z'),
    null,
  );

  it('closes BUY trades at stop loss before take profit when both are touched in the same candle', async () => {
    const strategyEngine = {
      evaluateStrategy: jest
        .fn()
        .mockReturnValueOnce({
          strategyId: 'strategy-id',
          strategyName: 'EMA_TREND_STRATEGY',
          direction: SignalDirection.BUY,
          entryPrice: 100,
          stopLoss: 90,
          takeProfit: 120,
          confidence: 90,
          reason: 'test',
          shouldCreateSignal: true,
        })
        .mockReturnValue({
          strategyId: 'strategy-id',
          strategyName: 'EMA_TREND_STRATEGY',
          direction: SignalDirection.NONE,
          entryPrice: 100,
          confidence: 0,
          reason: 'test',
          shouldCreateSignal: false,
        }),
    } as unknown as StrategyEngineService;
    const service = new BacktestingEngineService(
      strategyEngine,
      new BacktestingIndicatorsService(),
      new BacktestingMetricsService(),
    );

    const result = await service.run({
      backtestRunId: 'run-id',
      strategy,
      instrumentId: 'instrument-id',
      symbol: 'BTCUSDT',
      timeframe: Timeframe.M15,
      initialBalance: 10000,
      riskPercent: 0.01,
      candles: [
        candle('1', 100, 105, 95, 100, 0),
        candle('2', 100, 101, 99, 100, 1),
        candle('3', 100, 125, 85, 100, 2),
      ],
    });

    expect(result.trades).toHaveLength(1);
    expect(result.trades[0]).toMatchObject({
      entryPrice: 100,
      exitPrice: 90,
      pnl: -100,
      result: 'LOSS',
    });
    expect(result.metrics.netPnL).toBe(-100);
    expect(result.metrics.maxDrawdown).toBe(0.01);
  });
});

function candle(id: string, open: number, high: number, low: number, close: number, index: number) {
  return new MarketCandleEntity(
    id,
    'instrument-id',
    Timeframe.M15,
    open,
    high,
    low,
    close,
    1,
    new Date(Date.UTC(2024, 0, 1, 0, index * 15, 0)),
    'test',
    new Date(Date.UTC(2024, 0, 1, 0, index * 15, 0)),
  );
}
