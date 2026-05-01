import { Processor, WorkerHost } from '@nestjs/bullmq';
import { BadRequestException, Logger, NotFoundException } from '@nestjs/common';
import { AgentExecutionSource } from '@prisma/client';
import { Job, UnrecoverableError } from 'bullmq';
import { QUEUE_JOBS, QUEUE_NAMES } from '@/queues/queue.constants';
import { RiskEvaluationJobPayload } from '@/queues/risk-evaluation-queue.types';
import { RiskAgentService } from '../application/risk-agent.service';

const riskEvaluationConcurrency = parseInt(
  process.env.RISK_EVALUATION_QUEUE_CONCURRENCY ?? '5',
  10,
);

@Processor(QUEUE_NAMES.RISK_EVALUATION, { concurrency: riskEvaluationConcurrency })
export class RiskEvaluationProcessor extends WorkerHost {
  private readonly logger = new Logger(RiskEvaluationProcessor.name);

  constructor(private readonly riskAgent: RiskAgentService) {
    super();
  }

  async process(job: Job<RiskEvaluationJobPayload>) {
    if (job.name !== QUEUE_JOBS.RISK_EVALUATE) {
      this.logger.warn(`Ignoring unknown job ${job.name}`);
      return;
    }

    const startedAt = Date.now();
    this.logger.log(
      JSON.stringify({
        event: 'risk_evaluation_job',
        status: 'START',
        jobId: job.id,
        signalId: job.data.signalId,
        attempt: job.attemptsMade + 1,
      }),
    );

    try {
      const result = await this.riskAgent.evaluateSignalById(
        job.data.signalId,
        AgentExecutionSource.QUEUE,
      );
      this.logger.log(
        JSON.stringify({
          event: 'risk_evaluation_job',
          status: 'SUCCESS',
          jobId: job.id,
          signalId: job.data.signalId,
          assessmentId: result.assessment.id,
          decision: result.assessment.decision,
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
          event: 'risk_evaluation_job',
          status: 'FAILURE',
          jobId: job.id,
          signalId: job.data.signalId,
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
