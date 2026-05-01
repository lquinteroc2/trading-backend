import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Timeframe } from '@prisma/client';
import { Job } from 'bullmq';
import { QUEUE_JOBS, QUEUE_NAMES } from '@/queues/queue.constants';
import { TechnicalAnalyzeUseCase } from '../application/technical-analyze.use-case';

export type TechnicalAnalysisJobPayload = {
  instrumentId: string;
  timeframe: Timeframe;
  limit?: number;
};

@Processor(QUEUE_NAMES.TECHNICAL_ANALYSIS)
export class TechnicalAnalysisProcessor extends WorkerHost {
  private readonly logger = new Logger(TechnicalAnalysisProcessor.name);

  constructor(private readonly technicalAnalyze: TechnicalAnalyzeUseCase) {
    super();
  }

  async process(job: Job<TechnicalAnalysisJobPayload>) {
    if (job.name !== QUEUE_JOBS.TECHNICAL_ANALYSIS_ANALYZE) {
      this.logger.warn(`Ignoring unknown job ${job.name}`);
      return;
    }

    return this.technicalAnalyze.execute(job.data);
  }
}
