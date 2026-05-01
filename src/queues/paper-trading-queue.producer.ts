import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Queue } from 'bullmq';
import { InternalEventBus } from '@/events/internal-event-bus.service';
import { CandleClosedEvent, TRADING_EVENTS } from '@/events/trading-events';
import { QUEUE_JOBS, QUEUE_NAMES } from './queue.constants';
import {
  PaperTradeEvaluateOpenTradesJobPayload,
  PaperTradeOpenJobPayload,
  PaperTradingJobPayload,
} from './paper-trading-queue.types';

@Injectable()
export class PaperTradingQueueProducer implements OnModuleInit {
  private readonly logger = new Logger(PaperTradingQueueProducer.name);

  constructor(
    @InjectQueue(QUEUE_NAMES.PAPER_TRADING)
    private readonly queue: Queue<PaperTradingJobPayload>,
    private readonly eventBus: InternalEventBus,
  ) {}

  onModuleInit(): void {
    this.eventBus.on<CandleClosedEvent>(TRADING_EVENTS.CANDLE_CLOSED, async (event) => {
      if (!event.candleId) {
        return;
      }
      await this.enqueueEvaluateOpenTrades({ candleId: event.candleId });
    });
  }

  async enqueueOpenTrade(payload: PaperTradeOpenJobPayload) {
    const job = await this.queue.add(QUEUE_JOBS.PAPER_TRADE_OPEN, payload, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 1000 },
      removeOnComplete: true,
      removeOnFail: false,
      jobId: `paper-trade.open:${payload.signalId}:${payload.accountId ?? 'default'}`,
    });

    this.logger.log(
      JSON.stringify({
        event: 'paper_trade_open_enqueue',
        status: 'QUEUED',
        jobId: job.id,
        signalId: payload.signalId,
        accountId: payload.accountId,
      }),
    );

    return job;
  }

  async enqueueEvaluateOpenTrades(payload: PaperTradeEvaluateOpenTradesJobPayload) {
    const job = await this.queue.add(QUEUE_JOBS.PAPER_TRADE_EVALUATE_OPEN_TRADES, payload, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 1000 },
      removeOnComplete: true,
      removeOnFail: false,
      jobId: `paper-trade.evaluate-open-trades:${payload.candleId}`,
    });

    this.logger.log(
      JSON.stringify({
        event: 'paper_trade_evaluate_open_trades_enqueue',
        status: 'QUEUED',
        jobId: job.id,
        candleId: payload.candleId,
      }),
    );

    return job;
  }
}
