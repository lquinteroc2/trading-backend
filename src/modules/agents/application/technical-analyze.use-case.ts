import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { AgentDecisionAction, AgentType, Timeframe } from '@prisma/client';
import { ConfigService } from '@nestjs/config';
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
  timeframe: Timeframe;
  limit?: number;
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
  ) {}

  async execute(params: TechnicalAnalyzeParams): Promise<TechnicalAnalyzeOutput> {
    const minCandles = this.config.get<number>('technicalAgent.minCandles') ?? 200;
    const defaultLimit = this.config.get<number>('technicalAgent.defaultLimit') ?? 1000;
    const limit = params.limit ?? defaultLimit;

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
      timeframe: params.timeframe,
      limit,
      order: 'desc',
    });
    if (candles.length < minCandles) {
      throw new BadRequestException(`Not enough candles. Required ${minCandles}, found ${candles.length}`);
    }

    const orderedCandles = [...candles].sort(
      (left, right) => left.timestamp.getTime() - right.timestamp.getTime(),
    );
    const result = await this.technicalAnalysisProvider.analyzeCandles({
      symbol: instrument.symbol,
      timeframe: params.timeframe,
      candles: orderedCandles.map((candle) => ({
        timestamp: candle.timestamp,
        open: candle.open,
        high: candle.high,
        low: candle.low,
        close: candle.close,
        volume: candle.volume,
      })),
    });

    const decisionAction = this.toDecisionAction(result);
    const decision = await this.decisionsRepository.create({
      agentType: AgentType.TECHNICAL,
      instrumentId: params.instrumentId,
      decision: decisionAction,
      confidenceScore: result.confidenceScore,
      reasoning: result.reasoning.join('\n'),
      metadata: {
        symbol: result.symbol,
        timeframe: result.timeframe,
        candlesAnalyzed: result.candlesAnalyzed,
        trend: result.trend,
        technicalBias: result.technicalBias,
        indicators: result.indicators,
        warnings: result.warnings,
      },
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
}
