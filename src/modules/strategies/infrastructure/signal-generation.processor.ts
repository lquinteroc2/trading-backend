import { Processor, WorkerHost } from '@nestjs/bullmq';
import { BadRequestException, Logger, NotFoundException } from '@nestjs/common';
import { Job, UnrecoverableError } from 'bullmq';
import { QUEUE_JOBS, QUEUE_NAMES } from '@/queues/queue.constants';
import { SignalGenerationJobPayload } from '@/queues/signal-generation-queue.types';
import { SignalGenerationService } from '../application/signal-generation.service';

const signalGenerationConcurrency = parseInt(
  process.env.SIGNAL_GENERATION_QUEUE_CONCURRENCY ?? '5',
  10,
);

@Processor(QUEUE_NAMES.SIGNAL_GENERATION, { concurrency: signalGenerationConcurrency })
export class SignalGenerationProcessor extends WorkerHost {
  private readonly logger = new Logger(SignalGenerationProcessor.name);

  constructor(private readonly signalGeneration: SignalGenerationService) {
    super();
  }

  async process(job: Job<SignalGenerationJobPayload>) {
    if (job.name !== QUEUE_JOBS.SIGNAL_GENERATE) {
      this.logger.warn(`Ignoring unknown job ${job.name}`);
      return;
    }

    const startedAt = Date.now();
    this.logger.log(
      JSON.stringify({
        event: 'signal_generation_job',
        status: 'START',
        jobId: job.id,
        symbol: job.data.symbol,
        timeframe: job.data.timeframe,
        attempt: job.attemptsMade + 1,
      }),
    );

    try {
      const result = await this.signalGeneration.generate({
        agentDecisionId: job.data.agentDecisionId,
      });
      this.logger.log(
        JSON.stringify({
          event: 'signal_generation_job',
          status: 'SUCCESS',
          jobId: job.id,
          symbol: job.data.symbol,
          timeframe: job.data.timeframe,
          result: result.status,
          signalId: result.signal?.id,
          durationMs: Date.now() - startedAt,
        }),
      );
      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const retryable = !(
        error instanceof BadRequestException || error instanceof NotFoundException
      );
      this.logger.error(
        JSON.stringify({
          event: 'signal_generation_job',
          status: 'FAILURE',
          jobId: job.id,
          symbol: job.data.symbol,
          timeframe: job.data.timeframe,
          retryable,
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
}
