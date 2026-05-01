import { InjectQueue } from '@nestjs/bullmq';
import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Timeframe } from '@prisma/client';
import { Queue } from 'bullmq';
import { CandleClosedEvent, TRADING_EVENTS } from '@/events/trading-events';
import { InternalEventBus } from '@/events/internal-event-bus.service';
import { InstrumentsRepository } from '@/modules/instruments/domain/instruments.repository';
import { TOKENS } from '@/shared/tokens';
import { buildQueueJobId } from './queue-job-id';
import { QUEUE_JOBS, QUEUE_NAMES } from './queue.constants';
import { TechnicalAnalysisJobPayload } from './technical-analysis-queue.types';

export type EnqueueTechnicalAnalysisInput = {
  instrumentId: string;
  timeframe: Timeframe;
  symbol?: string;
  candleTimestamp?: Date;
  limit?: number;
  executionSource?: 'QUEUE' | 'MANUAL';
  force?: boolean;
};

export type EnqueueTechnicalAnalysisOutput = {
  jobId?: string;
  status: 'QUEUED' | 'SKIPPED_DUPLICATE';
  symbol: string;
  timeframe: Timeframe;
};

@Injectable()
export class TechnicalAnalysisQueueProducer implements OnModuleInit {
  private readonly logger = new Logger(TechnicalAnalysisQueueProducer.name);
  private readonly recentJobs = new Map<string, number>();

  constructor(
    @InjectQueue(QUEUE_NAMES.TECHNICAL_ANALYSIS)
    private readonly queue: Queue<TechnicalAnalysisJobPayload>,
    @Inject(TOKENS.INSTRUMENTS_REPOSITORY)
    private readonly instrumentsRepository: InstrumentsRepository,
    private readonly eventBus: InternalEventBus,
    private readonly config: ConfigService,
  ) {}

  onModuleInit(): void {
    this.eventBus.on<CandleClosedEvent>(TRADING_EVENTS.CANDLE_CLOSED, async (event) => {
      if (!event.triggerAnalysis) {
        return;
      }

      await this.enqueueTechnicalAnalysis({
        instrumentId: event.instrumentId,
        timeframe: event.timeframe,
        candleTimestamp: event.candleTimestamp,
        executionSource: 'QUEUE',
      });
    });
  }

  async enqueueTechnicalAnalysis(
    input: EnqueueTechnicalAnalysisInput,
  ): Promise<EnqueueTechnicalAnalysisOutput> {
    const symbol = input.symbol ?? (await this.resolveSymbol(input.instrumentId));
    const debounceMs = this.config.get<number>('technicalAgent.queueDebounceMs') ?? 30_000;
    const dedupeKey = `${symbol}:${input.timeframe}`;

    if (!input.force && this.isDebounced(dedupeKey, debounceMs)) {
      this.logger.log(
        JSON.stringify({
          event: 'technical_analysis_enqueue',
          status: 'SKIPPED_DUPLICATE',
          symbol,
          timeframe: input.timeframe,
        }),
      );
      return { status: 'SKIPPED_DUPLICATE', symbol, timeframe: input.timeframe };
    }

    this.recentJobs.set(dedupeKey, Date.now());

    const job = await this.queue.add(
      QUEUE_JOBS.TECHNICAL_ANALYSIS_ANALYZE,
      {
        instrumentId: input.instrumentId,
        symbol,
        timeframe: input.timeframe,
        candleTimestamp: input.candleTimestamp?.toISOString(),
        limit: input.limit,
        executionSource: input.executionSource ?? 'QUEUE',
      },
      {
        attempts: 3,
        backoff: { type: 'exponential', delay: 1000 },
        removeOnComplete: true,
        removeOnFail: false,
        jobId: input.candleTimestamp
          ? buildQueueJobId('technical-analysis', symbol, input.timeframe, input.candleTimestamp)
          : undefined,
      },
    );

    this.logger.log(
      JSON.stringify({
        event: 'technical_analysis_enqueue',
        status: 'QUEUED',
        jobId: job.id,
        symbol,
        timeframe: input.timeframe,
      }),
    );

    return { jobId: job.id, status: 'QUEUED', symbol, timeframe: input.timeframe };
  }

  private isDebounced(key: string, debounceMs: number): boolean {
    const now = Date.now();
    const lastQueuedAt = this.recentJobs.get(key);
    for (const [recentKey, timestamp] of this.recentJobs.entries()) {
      if (now - timestamp > debounceMs) {
        this.recentJobs.delete(recentKey);
      }
    }
    return lastQueuedAt !== undefined && now - lastQueuedAt <= debounceMs;
  }

  private async resolveSymbol(instrumentId: string): Promise<string> {
    const instrument = await this.instrumentsRepository.findById(instrumentId);
    if (!instrument) {
      throw new Error(`Instrument ${instrumentId} not found`);
    }
    return instrument.brokerSymbol ?? instrument.symbol;
  }
}
