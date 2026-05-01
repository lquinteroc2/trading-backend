import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Queue } from 'bullmq';
import { InternalEventBus } from '@/events/internal-event-bus.service';
import { SignalCreatedEvent, TRADING_EVENTS } from '@/events/trading-events';
import { QUEUE_JOBS, QUEUE_NAMES } from './queue.constants';
import { RiskEvaluationJobPayload } from './risk-evaluation-queue.types';

@Injectable()
export class RiskEvaluationQueueProducer implements OnModuleInit {
  private readonly logger = new Logger(RiskEvaluationQueueProducer.name);

  constructor(
    @InjectQueue(QUEUE_NAMES.RISK_EVALUATION)
    private readonly queue: Queue<RiskEvaluationJobPayload>,
    private readonly eventBus: InternalEventBus,
  ) {}

  onModuleInit(): void {
    this.eventBus.on<SignalCreatedEvent>(TRADING_EVENTS.SIGNAL_CREATED, async (event) => {
      await this.enqueue(event.signalId);
    });
  }

  async enqueue(signalId: string) {
    const job = await this.queue.add(
      QUEUE_JOBS.RISK_EVALUATE,
      { signalId },
      {
        attempts: 3,
        backoff: { type: 'exponential', delay: 1000 },
        removeOnComplete: true,
        removeOnFail: false,
        jobId: `risk-evaluation:${signalId}`,
      },
    );

    this.logger.log(
      JSON.stringify({
        event: 'risk_evaluation_enqueue',
        status: 'QUEUED',
        jobId: job.id,
        signalId,
      }),
    );

    return job;
  }
}
