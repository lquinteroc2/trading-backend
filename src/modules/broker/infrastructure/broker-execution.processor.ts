import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { QUEUE_JOBS, QUEUE_NAMES } from '@/queues/queue.constants';
import { BrokerExecutionJobPayload } from '@/queues/broker-execution-queue.types';
import { BrokerService } from '../application/broker.service';

@Processor(QUEUE_NAMES.BROKER_EXECUTION)
export class BrokerExecutionProcessor extends WorkerHost {
  private readonly logger = new Logger(BrokerExecutionProcessor.name);

  constructor(private readonly brokerService: BrokerService) {
    super();
  }

  async process(job: Job<BrokerExecutionJobPayload>) {
    if (job.name !== QUEUE_JOBS.BROKER_MT5_DRY_RUN) {
      this.logger.warn(`Unsupported broker execution job: ${job.name}`);
      return null;
    }
    return this.brokerService.dryRunOrderFromSignal(job.data.signalId);
  }
}
