import { Controller, Get } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { ApiTags } from '@nestjs/swagger';
import { Queue } from 'bullmq';
import { QUEUE_NAMES } from './queue.constants';

@ApiTags('queues')
@Controller('queues')
export class QueuesController {
  constructor(
    @InjectQueue(QUEUE_NAMES.TECHNICAL_ANALYSIS)
    private readonly technicalAnalysisQueue: Queue,
    @InjectQueue(QUEUE_NAMES.SIGNAL_GENERATION)
    private readonly signalGenerationQueue: Queue,
  ) {}

  @Get('technical-analysis')
  async getTechnicalAnalysisJobs() {
    return this.getQueueJobs(this.technicalAnalysisQueue);
  }

  @Get('signal-generation')
  async getSignalGenerationJobs() {
    return this.getQueueJobs(this.signalGenerationQueue);
  }

  private async getQueueJobs(queue: Queue) {
    const [active, failed, completed, waiting, delayed] = await Promise.all([
      queue.getJobs(['active']),
      queue.getJobs(['failed']),
      queue.getJobs(['completed']),
      queue.getJobs(['waiting']),
      queue.getJobs(['delayed']),
    ]);

    return {
      active: active.map((job) => this.serializeJob(job)),
      failed: failed.map((job) => this.serializeJob(job)),
      completed: completed.map((job) => this.serializeJob(job)),
      waiting: waiting.map((job) => this.serializeJob(job)),
      delayed: delayed.map((job) => this.serializeJob(job)),
    };
  }

  private serializeJob(job: Awaited<ReturnType<Queue['getJobs']>>[number]) {
    return {
      id: job.id,
      name: job.name,
      data: job.data,
      attemptsMade: job.attemptsMade,
      failedReason: job.failedReason,
      timestamp: job.timestamp,
      processedOn: job.processedOn,
      finishedOn: job.finishedOn,
    };
  }
}
