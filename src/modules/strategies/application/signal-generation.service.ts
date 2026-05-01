import { BadRequestException, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AgentType, SignalDirection, SignalStatus, SourceAgent, Timeframe } from '@prisma/client';
import { AgentDecisionsRepository } from '@/modules/agents/domain/agent-decisions.repository';
import { InstrumentsRepository } from '@/modules/instruments/domain/instruments.repository';
import { MarketCandlesRepository } from '@/modules/market-data/domain/market-candles.repository';
import { SignalsService } from '@/modules/signals/application/signals.service';
import { TradingSignalEntity } from '@/modules/signals/domain/trading-signal.entity';
import { TOKENS } from '@/shared/tokens';
import { StrategyEngineService } from './strategy-engine.service';

export type GenerateSignalInput = {
  agentDecisionId?: string;
  instrumentId?: string;
  timeframe?: Timeframe;
};

export type GenerateSignalOutput = {
  status: 'CREATED' | 'NO_SIGNAL' | 'SKIPPED_DUPLICATE';
  signal?: TradingSignalEntity;
  reason: string;
};

type TechnicalDecisionMetadata = {
  symbol?: string;
  timeframe?: Timeframe;
  technicalBias?: 'BULLISH' | 'BEARISH' | 'NEUTRAL' | string;
  indicators?: Record<string, unknown>;
};

@Injectable()
export class SignalGenerationService {
  private readonly logger = new Logger(SignalGenerationService.name);

  constructor(
    @Inject(TOKENS.AGENT_DECISIONS_REPOSITORY)
    private readonly decisionsRepository: AgentDecisionsRepository,
    @Inject(TOKENS.INSTRUMENTS_REPOSITORY)
    private readonly instrumentsRepository: InstrumentsRepository,
    @Inject(TOKENS.MARKET_CANDLES_REPOSITORY)
    private readonly candlesRepository: MarketCandlesRepository,
    private readonly signalsService: SignalsService,
    private readonly strategyEngine: StrategyEngineService,
    private readonly config: ConfigService,
  ) {}

  async generate(input: GenerateSignalInput): Promise<GenerateSignalOutput> {
    const decision = input.agentDecisionId
      ? await this.decisionsRepository.findById(input.agentDecisionId)
      : await this.findLatestDecision(input);

    if (!decision) {
      throw new NotFoundException('Technical analysis decision not found');
    }
    if (decision.agentType !== AgentType.TECHNICAL) {
      throw new BadRequestException('Signal generation requires a TECHNICAL agent decision');
    }

    const metadata = this.readMetadata(decision.metadata);
    const timeframe = input.timeframe ?? metadata.timeframe;
    if (!timeframe) {
      throw new BadRequestException('Technical analysis timeframe is missing');
    }

    const minConfidence = this.config.get<number>('signals.minConfidence') ?? 50;
    if (decision.confidenceScore < minConfidence) {
      return this.noSignal(metadata.symbol, timeframe, `Technical confidence ${decision.confidenceScore} < ${minConfidence}`);
    }
    if (metadata.technicalBias === 'NEUTRAL') {
      return this.noSignal(metadata.symbol, timeframe, 'Technical bias is NEUTRAL');
    }

    const instrument = await this.instrumentsRepository.findById(decision.instrumentId);
    if (!instrument) {
      throw new NotFoundException('Instrument not found');
    }

    const candles = await this.candlesRepository.findMany({
      instrumentId: decision.instrumentId,
      timeframe,
      order: 'desc',
      limit: 20,
    });
    if (candles.length === 0) {
      throw new BadRequestException('No candles found for signal generation');
    }

    const latestCandle = candles[0];
    const existing = await this.signalsService.findByCandleKey({
      instrumentId: decision.instrumentId,
      timeframe,
      candleTimestamp: latestCandle.timestamp,
    });
    if (existing) {
      return { status: 'SKIPPED_DUPLICATE', signal: existing, reason: 'Signal already exists for candle' };
    }

    const results = await this.strategyEngine.evaluateActiveStrategies({
      instrumentId: decision.instrumentId,
      symbol: metadata.symbol ?? instrument.symbol,
      timeframe,
      technicalAnalysis: decision,
      latestCandle,
      candles: [...candles].sort((left, right) => left.timestamp.getTime() - right.timestamp.getTime()),
    });

    const result = results.find((candidate) => candidate.shouldCreateSignal);
    if (!result || result.direction === SignalDirection.NONE) {
      const reason = results[0]?.reason ?? 'No active strategy generated a signal';
      return this.noSignal(metadata.symbol ?? instrument.symbol, timeframe, reason);
    }

    const signal = await this.signalsService.create({
      instrumentId: decision.instrumentId,
      strategyId: result.strategyId,
      timeframe,
      direction: result.direction,
      entryPrice: result.entryPrice,
      stopLoss: result.stopLoss,
      takeProfit: result.takeProfit,
      confidenceScore: result.confidence,
      status: SignalStatus.CREATED,
      sourceAgent: SourceAgent.TECHNICAL,
      candleTimestamp: latestCandle.timestamp,
      reason: result.reason,
      reasoning: result.reason,
    });

    this.logger.log(
      JSON.stringify({
        event: 'signal_generation',
        symbol: metadata.symbol ?? instrument.symbol,
        timeframe,
        decision: signal.direction,
        confidence: signal.confidenceScore,
        signalId: signal.id,
      }),
    );

    return { status: 'CREATED', signal, reason: result.reason };
  }

  private async findLatestDecision(input: GenerateSignalInput) {
    if (!input.instrumentId || !input.timeframe) {
      throw new BadRequestException('instrumentId and timeframe are required when agentDecisionId is not provided');
    }

    return this.decisionsRepository.findLatest({
      agentType: AgentType.TECHNICAL,
      instrumentId: input.instrumentId,
      timeframe: input.timeframe,
    });
  }

  private readMetadata(metadata: unknown): TechnicalDecisionMetadata {
    if (!metadata || typeof metadata !== 'object') {
      return {};
    }
    return metadata as TechnicalDecisionMetadata;
  }

  private noSignal(symbol: string | undefined, timeframe: Timeframe, reason: string): GenerateSignalOutput {
    this.logger.log(
      JSON.stringify({
        event: 'signal_generation',
        symbol,
        timeframe,
        decision: SignalDirection.NONE,
        confidence: 0,
        reason,
      }),
    );
    return { status: 'NO_SIGNAL', reason };
  }
}
