import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Queue } from 'bullmq';
import { buildQueueJobId } from './queue-job-id';
import { QUEUE_JOBS, QUEUE_NAMES } from './queue.constants';
import { BrokerExecutionJobPayload, BrokerMt5DryRunJobPayload } from './broker-execution-queue.types';

@Injectable()
export class BrokerExecutionQueueProducer {
  private readonly logger = new Logger(BrokerExecutionQueueProducer.name);

  constructor(
    @InjectQueue(QUEUE_NAMES.BROKER_EXECUTION)
    private readonly queue: Queue<BrokerExecutionJobPayload>,
  ) {}

  async enqueueMt5DryRun(payload: BrokerMt5DryRunJobPayload) {
    const job = await this.queue.add(QUEUE_JOBS.BROKER_MT5_DRY_RUN, payload, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 1000 },
      removeOnComplete: true,
      removeOnFail: false,
      jobId: buildQueueJobId('broker.mt5.dry-run', payload.signalId),
    });

    this.logger.log(
      JSON.stringify({
        event: 'broker_mt5_dry_run_enqueue',
        status: 'QUEUED',
        jobId: job.id,
        signalId: payload.signalId,
      }),
    );

    return job;
  }
}
