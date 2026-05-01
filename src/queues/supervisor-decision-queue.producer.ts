import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Queue } from 'bullmq';
import { InternalEventBus } from '@/events/internal-event-bus.service';
import { RiskEvaluatedEvent, TRADING_EVENTS } from '@/events/trading-events';
import { QUEUE_JOBS, QUEUE_NAMES } from './queue.constants';
import { SupervisorDecisionJobPayload } from './supervisor-decision-queue.types';

@Injectable()
export class SupervisorDecisionQueueProducer implements OnModuleInit {
  private readonly logger = new Logger(SupervisorDecisionQueueProducer.name);

  constructor(
    @InjectQueue(QUEUE_NAMES.SUPERVISOR_DECISION)
    private readonly queue: Queue<SupervisorDecisionJobPayload>,
    private readonly eventBus: InternalEventBus,
  ) {}

  onModuleInit(): void {
    this.eventBus.on<RiskEvaluatedEvent>(TRADING_EVENTS.RISK_EVALUATED, async (event) => {
      await this.enqueue(event.signalId);
    });
  }

  async enqueue(signalId: string) {
    const job = await this.queue.add(
      QUEUE_JOBS.SUPERVISOR_DECIDE,
      { signalId },
      {
        attempts: 3,
        backoff: { type: 'exponential', delay: 1000 },
        removeOnComplete: true,
        removeOnFail: false,
        jobId: `supervisor-decision:${signalId}`,
      },
    );

    this.logger.log(
      JSON.stringify({
        event: 'supervisor_decision_enqueue',
        status: 'QUEUED',
        jobId: job.id,
        signalId,
      }),
    );

    return job;
  }
}
