import { Inject, Injectable, Logger } from '@nestjs/common';
import { TOKENS } from '@/shared/tokens';
import { StrategiesRepository } from '../domain/strategies.repository';
import { IStrategy, StrategyContext, StrategyResult } from '../domain/strategy.types';
import { EmaTrendStrategyService } from './ema-trend-strategy.service';

@Injectable()
export class StrategyEngineService {
  private readonly logger = new Logger(StrategyEngineService.name);

  constructor(
    @Inject(TOKENS.STRATEGIES_REPOSITORY)
    private readonly strategiesRepository: StrategiesRepository,
    private readonly emaTrendStrategy: EmaTrendStrategyService,
  ) {}

  async evaluateActiveStrategies(context: StrategyContext): Promise<StrategyResult[]> {
    const strategies = await this.strategiesRepository.findActive();
    const implementations = this.implementations();
    const results: StrategyResult[] = [];

    for (const strategy of strategies) {
      const implementation = implementations.get(strategy.name);
      if (!implementation) {
        this.logger.warn(`No implementation registered for strategy ${strategy.name}`);
        continue;
      }

      const result = implementation.evaluate(context, strategy);
      this.logger.log(
        JSON.stringify({
          event: 'strategy_evaluation',
          symbol: context.symbol,
          timeframe: context.timeframe,
          strategy: strategy.name,
          decision: result.direction,
          confidence: result.confidence,
          reason: result.reason,
        }),
      );
      results.push(result);
    }

    return results;
  }

  private implementations(): Map<string, IStrategy> {
    return new Map([[this.emaTrendStrategy.name, this.emaTrendStrategy]]);
  }
}
