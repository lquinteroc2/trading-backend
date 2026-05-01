import { ConfigService } from '@nestjs/config';
import { MarketType, Timeframe } from '@prisma/client';
import { InternalEventBus } from '@/events/internal-event-bus.service';
import { TRADING_EVENTS } from '@/events/trading-events';
import { TechnicalAnalysisQueueProducer } from '@/queues/technical-analysis-queue.producer';
import { InstrumentsRepository } from '@/modules/instruments/domain/instruments.repository';

describe('TechnicalAnalysisQueueProducer', () => {
  const instrument = {
    id: 'instrument-id',
    symbol: 'BTCUSDT',
    name: 'Bitcoin',
    marketType: MarketType.CRYPTO,
    brokerSymbol: 'BTCUSDT',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const makeProducer = () => {
    const queue = {
      add: jest.fn().mockResolvedValue({ id: 'job-id' }),
    };
    const instruments = {
      findById: jest.fn().mockResolvedValue(instrument),
    } as unknown as jest.Mocked<InstrumentsRepository>;
    const eventBus = new InternalEventBus();
    const config = {
      get: jest.fn((key: string) => {
        const values: Record<string, unknown> = {
          'technicalAgent.queueDebounceMs': 30_000,
        };
        return values[key];
      }),
    } as unknown as ConfigService;

    return {
      producer: new TechnicalAnalysisQueueProducer(
        queue as never,
        instruments,
        eventBus,
        config,
      ),
      queue,
      eventBus,
    };
  };

  it('enqueues technical analysis when a closed candle event is emitted', async () => {
    const { producer, queue, eventBus } = makeProducer();
    producer.onModuleInit();

    eventBus.emit(TRADING_EVENTS.CANDLE_CLOSED, {
      instrumentId: instrument.id,
      timeframe: Timeframe.M15,
      candleTimestamp: new Date('2024-01-01T00:00:00.000Z'),
      source: 'MANUAL',
      triggerAnalysis: true,
    });
    await new Promise(setImmediate);

    expect(queue.add).toHaveBeenCalledWith(
      'technical-analysis.analyze',
      expect.objectContaining({
        instrumentId: instrument.id,
        symbol: 'BTCUSDT',
        timeframe: Timeframe.M15,
        candleTimestamp: '2024-01-01T00:00:00.000Z',
        executionSource: 'QUEUE',
      }),
      expect.objectContaining({
        attempts: 3,
        removeOnComplete: true,
        removeOnFail: false,
      }),
    );
  });

  it('does not enqueue duplicates inside the debounce window', async () => {
    const { producer, queue } = makeProducer();

    await producer.enqueueTechnicalAnalysis({
      instrumentId: instrument.id,
      timeframe: Timeframe.M15,
      candleTimestamp: new Date('2024-01-01T00:00:00.000Z'),
    });
    const second = await producer.enqueueTechnicalAnalysis({
      instrumentId: instrument.id,
      timeframe: Timeframe.M15,
      candleTimestamp: new Date('2024-01-01T00:15:00.000Z'),
    });

    expect(queue.add).toHaveBeenCalledTimes(1);
    expect(second).toMatchObject({ status: 'SKIPPED_DUPLICATE' });
  });
});
