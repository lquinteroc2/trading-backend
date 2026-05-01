import { Processor, WorkerHost } from '@nestjs/bullmq';
import { BadRequestException, Logger, NotFoundException } from '@nestjs/common';
import { AgentExecutionSource, SupervisorDecisionAction } from '@prisma/client';
import { Job, UnrecoverableError } from 'bullmq';
import { PaperTradingQueueProducer } from '@/queues/paper-trading-queue.producer';
import { QUEUE_JOBS, QUEUE_NAMES } from '@/queues/queue.constants';
import { SupervisorDecisionJobPayload } from '@/queues/supervisor-decision-queue.types';
import { SupervisorAgentService } from '../application/supervisor-agent.service';

const supervisorDecisionConcurrency = parseInt(
  process.env.SUPERVISOR_DECISION_QUEUE_CONCURRENCY ?? '5',
  10,
);

@Processor(QUEUE_NAMES.SUPERVISOR_DECISION, { concurrency: supervisorDecisionConcurrency })
export class SupervisorDecisionProcessor extends WorkerHost {
  private readonly logger = new Logger(SupervisorDecisionProcessor.name);

  constructor(
    private readonly supervisorAgent: SupervisorAgentService,
    private readonly paperTradingQueueProducer: PaperTradingQueueProducer,
  ) {
    super();
  }

  async process(job: Job<SupervisorDecisionJobPayload>) {
    if (job.name !== QUEUE_JOBS.SUPERVISOR_DECIDE) {
      this.logger.warn(`Ignoring unknown job ${job.name}`);
      return;
    }

    const startedAt = Date.now();
    this.logger.log(
      JSON.stringify({
        event: 'supervisor_decision_job',
        status: 'START',
        jobId: job.id,
        signalId: job.data.signalId,
        attempt: job.attemptsMade + 1,
      }),
    );

    try {
      const result = await this.supervisorAgent.decideSignalById(
        job.data.signalId,
        AgentExecutionSource.QUEUE,
      );
      if (result.supervisorDecision.decision === SupervisorDecisionAction.OPERATE) {
        await this.paperTradingQueueProducer.enqueueOpenTrade({ signalId: job.data.signalId });
      }
      this.logger.log(
        JSON.stringify({
          event: 'supervisor_decision_job',
          status: 'SUCCESS',
          jobId: job.id,
          signalId: job.data.signalId,
          decisionId: result.supervisorDecision.id,
          decision: result.supervisorDecision.decision,
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
          event: 'supervisor_decision_job',
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
