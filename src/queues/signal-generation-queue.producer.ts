import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Queue } from 'bullmq';
import { TechnicalAnalysisCompletedEvent, TRADING_EVENTS } from '@/events/trading-events';
import { InternalEventBus } from '@/events/internal-event-bus.service';
import { buildQueueJobId } from './queue-job-id';
import { QUEUE_JOBS, QUEUE_NAMES } from './queue.constants';
import { SignalGenerationJobPayload } from './signal-generation-queue.types';

@Injectable()
export class SignalGenerationQueueProducer implements OnModuleInit {
  private readonly logger = new Logger(SignalGenerationQueueProducer.name);

  constructor(
    @InjectQueue(QUEUE_NAMES.SIGNAL_GENERATION)
    private readonly queue: Queue<SignalGenerationJobPayload>,
    private readonly eventBus: InternalEventBus,
  ) {}

  onModuleInit(): void {
    this.eventBus.on<TechnicalAnalysisCompletedEvent>(
      TRADING_EVENTS.TECHNICAL_ANALYSIS_COMPLETED,
      async (event) => {
        await this.enqueue(event);
      },
    );
  }

  async enqueue(event: TechnicalAnalysisCompletedEvent) {
    const job = await this.queue.add(
      QUEUE_JOBS.SIGNAL_GENERATE,
      {
        agentDecisionId: event.agentDecisionId,
        instrumentId: event.instrumentId,
        timeframe: event.timeframe,
        symbol: event.symbol,
      },
      {
        attempts: 3,
        backoff: { type: 'exponential', delay: 1000 },
        removeOnComplete: true,
        removeOnFail: false,
        jobId: buildQueueJobId('signal-generation', event.agentDecisionId),
      },
    );

    this.logger.log(
      JSON.stringify({
        event: 'signal_generation_enqueue',
        status: 'QUEUED',
        jobId: job.id,
        symbol: event.symbol,
        timeframe: event.timeframe,
      }),
    );

    return job;
  }
}
