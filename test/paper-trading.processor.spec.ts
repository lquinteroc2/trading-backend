import { PaperTradingProcessor } from '@/modules/paper-trading/infrastructure/paper-trading.processor';
import { QUEUE_JOBS } from '@/queues/queue.constants';

describe('PaperTradingProcessor', () => {
  it('processes paper-trade.open jobs', async () => {
    const engine = {
      openTradeFromSignal: jest.fn(async () => ({ id: 'trade-1' })),
      evaluateOpenTradesOnCandleId: jest.fn(),
    };
    const processor = new PaperTradingProcessor(engine as never);

    await processor.process({
      id: 'job-1',
      name: QUEUE_JOBS.PAPER_TRADE_OPEN,
      data: { signalId: 'signal-1', accountId: 'account-1' },
      attemptsMade: 0,
    } as never);

    expect(engine.openTradeFromSignal).toHaveBeenCalledWith('signal-1', 'account-1');
  });

  it('processes evaluate-open-trades jobs', async () => {
    const engine = {
      openTradeFromSignal: jest.fn(),
      evaluateOpenTradesOnCandleId: jest.fn(async () => []),
    };
    const processor = new PaperTradingProcessor(engine as never);

    await processor.process({
      id: 'job-2',
      name: QUEUE_JOBS.PAPER_TRADE_EVALUATE_OPEN_TRADES,
      data: { candleId: 'candle-1' },
      attemptsMade: 0,
    } as never);

    expect(engine.evaluateOpenTradesOnCandleId).toHaveBeenCalledWith('candle-1');
  });
});
