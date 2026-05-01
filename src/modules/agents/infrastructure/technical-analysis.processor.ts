import { Processor, WorkerHost } from '@nestjs/bullmq';
import { BadRequestException, Logger, NotFoundException } from '@nestjs/common';
import { AgentExecutionSource } from '@prisma/client';
import { Job, UnrecoverableError } from 'bullmq';
import { QUEUE_JOBS, QUEUE_NAMES } from '@/queues/queue.constants';
import { TechnicalAnalysisJobPayload } from '@/queues/technical-analysis-queue.types';
import { TechnicalAnalyzeUseCase } from '../application/technical-analyze.use-case';

const technicalAnalysisConcurrency = parseInt(
  process.env.TECHNICAL_ANALYSIS_QUEUE_CONCURRENCY ?? '5',
  10,
);

@Processor(QUEUE_NAMES.TECHNICAL_ANALYSIS, { concurrency: technicalAnalysisConcurrency })
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

    const startedAt = Date.now();
    this.logger.log(
      JSON.stringify({
        event: 'technical_analysis_job',
        status: 'START',
        jobId: job.id,
        symbol: job.data.symbol,
        timeframe: job.data.timeframe,
        attempt: job.attemptsMade + 1,
      }),
    );

    try {
      const result = await this.technicalAnalyze.execute({
        instrumentId: job.data.instrumentId,
        timeframe: job.data.timeframe,
        limit: job.data.limit,
        executionSource: AgentExecutionSource.QUEUE,
      });

      this.logger.log(
        JSON.stringify({
          event: 'technical_analysis_job',
          status: 'SUCCESS',
          jobId: job.id,
          symbol: job.data.symbol,
          timeframe: job.data.timeframe,
          decision: result.decision,
          confidenceScore: result.confidenceScore,
          durationMs: Date.now() - startedAt,
        }),
      );

      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const retryable = this.isRetryable(error);

      this.logger.error(
        JSON.stringify({
          event: 'technical_analysis_job',
          status: 'FAILURE',
          jobId: job.id,
          symbol: job.data.symbol,
          timeframe: job.data.timeframe,
          retryable,
          attempt: job.attemptsMade + 1,
          durationMs: Date.now() - startedAt,
          error: message,
        }),
      );

      if (!retryable) {
        throw new UnrecoverableError(message);
      }
      throw error;
    }
  }

  private isRetryable(error: unknown): boolean {
    if (error instanceof BadRequestException || error instanceof NotFoundException) {
      return false;
    }
    if (error instanceof Error && error.message.includes('invalid JSON')) {
      return false;
    }
    return true;
  }
}
