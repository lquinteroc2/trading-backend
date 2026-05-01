import { Logger } from '@nestjs/common';
import { WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';

export abstract class LoggingProcessor extends WorkerHost {
  protected readonly logger = new Logger(this.constructor.name);

  async process(job: Job): Promise<void> {
    this.logger.log(`Received job ${job.id ?? 'unknown'} on ${job.queueName}`);
  }
}
