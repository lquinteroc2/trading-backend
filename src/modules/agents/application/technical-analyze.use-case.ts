import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { AgentDecisionAction, AgentExecutionSource, AgentType, Timeframe } from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import { InternalEventBus } from '@/events/internal-event-bus.service';
import { TRADING_EVENTS } from '@/events/trading-events';
import { TOKENS } from '@/shared/tokens';
import { InstrumentsRepository } from '@/modules/instruments/domain/instruments.repository';
import { MarketCandlesRepository } from '@/modules/market-data/domain/market-candles.repository';
import { AgentDecisionsRepository } from '../domain/agent-decisions.repository';
import {
  TechnicalAnalysisProvider,
  TechnicalAnalysisResult,
} from '../domain/technical-analysis-provider.interface';

export type TechnicalAnalyzeParams = {
  instrumentId: string;
  timeframe?: Timeframe;
  primaryTimeframe?: Timeframe;
  confirmationTimeframes?: Timeframe[];
  limit?: number;
  executionSource?: AgentExecutionSource;
};

export type TechnicalAnalyzeOutput = TechnicalAnalysisResult & {
  agentDecisionId: string;
  decision: AgentDecisionAction;
};

@Injectable()
export class TechnicalAnalyzeUseCase {
  constructor(
    @Inject(TOKENS.INSTRUMENTS_REPOSITORY)
    private readonly instrumentsRepository: InstrumentsRepository,
    @Inject(TOKENS.MARKET_CANDLES_REPOSITORY)
    private readonly candlesRepository: MarketCandlesRepository,
    @Inject(TOKENS.AGENT_DECISIONS_REPOSITORY)
    private readonly decisionsRepository: AgentDecisionsRepository,
    @Inject(TOKENS.TECHNICAL_ANALYSIS_PROVIDER)
    private readonly technicalAnalysisProvider: TechnicalAnalysisProvider,
    private readonly config: ConfigService,
    private readonly eventBus?: InternalEventBus,
  ) {}

  async execute(params: TechnicalAnalyzeParams): Promise<TechnicalAnalyzeOutput> {
    const minCandles = this.config.get<number>('technicalAgent.minCandles') ?? 200;
    const defaultLimit = this.config.get<number>('technicalAgent.defaultLimit') ?? 1000;
    const limit = params.limit ?? defaultLimit;
    const primaryTimeframe = params.primaryTimeframe ?? params.timeframe;

    if (!primaryTimeframe) {
      throw new BadRequestException('timeframe or primaryTimeframe is required');
    }

    if (limit < minCandles) {
      throw new BadRequestException(`At least ${minCandles} candles are required`);
    }

    const instrument = await this.instrumentsRepository.findById(params.instrumentId);
    if (!instrument) {
      throw new NotFoundException('Instrument not found');
    }
    if (!instrument.isActive) {
      throw new BadRequestException('Instrument is inactive');
    }

    const candles = await this.candlesRepository.findMany({
      instrumentId: params.instrumentId,
      timeframe: primaryTimeframe,
      limit,
      order: 'desc',
    });
    if (candles.length < minCandles) {
      throw new BadRequestException(
        `Not enough candles. Required ${minCandles}, found ${candles.length}`,
      );
    }

    const orderedCandles = [...candles].sort(
      (left, right) => left.timestamp.getTime() - right.timestamp.getTime(),
    );
    const confirmationTimeframes = this.resolveConfirmationTimeframes(
      primaryTimeframe,
      params.confirmationTimeframes,
    );
    const candlesByTimeframe: Partial<Record<Timeframe, typeof orderedCandles>> = {
      [primaryTimeframe]: orderedCandles,
    };
    for (const timeframe of confirmationTimeframes) {
      const confirmationCandles = await this.candlesRepository.findMany({
        instrumentId: params.instrumentId,
        timeframe,
        limit,
        order: 'desc',
      });
      if (confirmationCandles.length >= minCandles) {
        candlesByTimeframe[timeframe] = [...confirmationCandles].sort(
          (left, right) => left.timestamp.getTime() - right.timestamp.getTime(),
        );
      }
    }

    const result = await this.technicalAnalysisProvider.analyzeCandles({
      symbol: instrument.symbol,
      timeframe: primaryTimeframe,
      primaryTimeframe,
      candles: orderedCandles.map((candle) => ({
        timestamp: candle.timestamp,
        open: candle.open,
        high: candle.high,
        low: candle.low,
        close: candle.close,
        volume: candle.volume,
      })),
      timeframes: Object.fromEntries(
        Object.entries(candlesByTimeframe).map(([timeframe, timeframeCandles]) => [
          timeframe,
          (timeframeCandles ?? []).map((candle) => ({
            timestamp: candle.timestamp,
            open: candle.open,
            high: candle.high,
            low: candle.low,
            close: candle.close,
            volume: candle.volume,
          })),
        ]),
      ),
    });

    const decisionAction = this.toDecisionAction(result);
    const decision = await this.decisionsRepository.create({
      agentType: AgentType.TECHNICAL,
      instrumentId: params.instrumentId,
      decision: decisionAction,
      executionSource: params.executionSource ?? AgentExecutionSource.MANUAL,
      confidenceScore: result.confidenceScore,
      reasoning: result.reasoning.join('\n'),
      metadata: {
        symbol: result.symbol,
        timeframe: result.timeframe,
        primaryTimeframe: result.primaryTimeframe ?? primaryTimeframe,
        confirmationTimeframes,
        candlesAnalyzed: result.candlesAnalyzed,
        trend: result.trend,
        technicalBias: result.technicalBias,
        indicators: result.indicators,
        supportResistance: result.supportResistance,
        marketRegime: result.marketRegime,
        multiTimeframe: result.multiTimeframe,
        rawResponse: result,
        warnings: result.warnings,
      },
    });

    this.eventBus?.emit(TRADING_EVENTS.TECHNICAL_ANALYSIS_COMPLETED, {
      agentDecisionId: decision.id,
      instrumentId: params.instrumentId,
      timeframe: primaryTimeframe,
      symbol: instrument.symbol,
    });

    return {
      ...result,
      agentDecisionId: decision.id,
      decision: decisionAction,
    };
  }

  private toDecisionAction(result: TechnicalAnalysisResult): AgentDecisionAction {
    if (result.confidenceScore >= 70 && result.technicalBias !== 'NEUTRAL') {
      return AgentDecisionAction.APPROVE;
    }
    if (result.confidenceScore >= 40 && result.confidenceScore <= 69) {
      return AgentDecisionAction.WAIT;
    }
    return AgentDecisionAction.REJECT;
  }

  private resolveConfirmationTimeframes(
    primaryTimeframe: Timeframe,
    requested?: Timeframe[],
  ): Timeframe[] {
    const enabled = this.config.get<boolean>('technicalAgent.enableMultiTimeframe') ?? true;
    if (!enabled) {
      return [];
    }
    const configured = this.config.get<Timeframe[]>('technicalAgent.confirmationTimeframes') ?? [
      Timeframe.H1,
      Timeframe.H4,
    ];
    const candidates = requested ?? configured;
    return [...new Set(candidates)].filter((timeframe) => timeframe !== primaryTimeframe);
  }
}
