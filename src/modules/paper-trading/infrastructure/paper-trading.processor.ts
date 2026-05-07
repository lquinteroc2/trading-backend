import { Processor, WorkerHost } from '@nestjs/bullmq';
import { BadRequestException, Logger, NotFoundException, Optional } from '@nestjs/common';
import { Job, UnrecoverableError } from 'bullmq';
import { InternalEventBus } from '@/events/internal-event-bus.service';
import { TRADING_EVENTS } from '@/events/trading-events';
import { QUEUE_JOBS, QUEUE_NAMES } from '@/queues/queue.constants';
import {
  PaperTradeEvaluateOpenTradesJobPayload,
  PaperTradeOpenJobPayload,
  PaperTradingJobPayload,
} from '@/queues/paper-trading-queue.types';
import { PaperTradingEngineService } from '../application/paper-trading-engine.service';

const paperTradingConcurrency = parseInt(process.env.PAPER_TRADING_QUEUE_CONCURRENCY ?? '5', 10);

@Processor(QUEUE_NAMES.PAPER_TRADING, { concurrency: paperTradingConcurrency })
export class PaperTradingProcessor extends WorkerHost {
  private readonly logger = new Logger(PaperTradingProcessor.name);

  constructor(
    private readonly engine: PaperTradingEngineService,
    @Optional()
    private readonly eventBus?: InternalEventBus,
  ) {
    super();
  }

  async process(job: Job<PaperTradingJobPayload>) {
    const startedAt = Date.now();
    this.logger.log(
      JSON.stringify({
        event: 'paper_trading_job',
        status: 'START',
        jobId: job.id,
        jobName: job.name,
        attempt: job.attemptsMade + 1,
      }),
    );

    try {
      const result = await this.handleJob(job);
      this.logger.log(
        JSON.stringify({
          event: 'paper_trading_job',
          status: 'SUCCESS',
          jobId: job.id,
          jobName: job.name,
          durationMs: Date.now() - startedAt,
        }),
      );
      this.eventBus?.emit(TRADING_EVENTS.JOB_COMPLETED, {
        source: 'paper-trading',
        jobId: String(job.id ?? ''),
        message: 'Paper trading job completed',
        payload: {
          jobName: job.name,
        },
      });
      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const retryable = !(
        error instanceof BadRequestException || error instanceof NotFoundException
      );
      this.logger.error(
        JSON.stringify({
          event: 'paper_trading_job',
          status: 'FAILURE',
          jobId: job.id,
          jobName: job.name,
          retryable,
          durationMs: Date.now() - startedAt,
          error: message,
        }),
      );
      this.eventBus?.emit(TRADING_EVENTS.JOB_FAILED, {
        source: 'paper-trading',
        jobId: String(job.id ?? ''),
        message,
      });
      if (!retryable) {
        throw new UnrecoverableError(message);
      }
      throw error;
    }
  }

  private handleJob(job: Job<PaperTradingJobPayload>) {
    if (job.name === QUEUE_JOBS.PAPER_TRADE_OPEN) {
      const data = job.data as PaperTradeOpenJobPayload;
      return this.engine.openTradeFromSignal(data.signalId, data.accountId);
    }

    if (job.name === QUEUE_JOBS.PAPER_TRADE_EVALUATE_OPEN_TRADES) {
      const data = job.data as PaperTradeEvaluateOpenTradesJobPayload;
      return this.engine.evaluateOpenTradesOnCandleId(data.candleId);
    }

    this.logger.warn(`Ignoring unknown job ${job.name}`);
    return undefined;
  }
}
