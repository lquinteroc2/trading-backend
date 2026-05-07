import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { TOKENS } from '@/shared/tokens';
import { InstrumentsService } from '@/modules/instruments/application/instruments.service';
import { MarketCandlesRepository } from '@/modules/market-data/domain/market-candles.repository';
import { StrategiesRepository } from '@/modules/strategies/domain/strategies.repository';
import { BacktestRunsRepository } from '../domain/backtest-runs.repository';
import { BacktestingEngineService } from './backtesting-engine.service';
import { RunBacktestDto } from '../presentation/dto/run-backtest.dto';

const MIN_BACKTEST_CANDLES = 500;
const DEFAULT_STRATEGY_NAME = 'EMA_TREND_STRATEGY';

@Injectable()
export class RunBacktestUseCase {
  constructor(
    private readonly instrumentsService: InstrumentsService,
    private readonly engine: BacktestingEngineService,
    @Inject(TOKENS.MARKET_CANDLES_REPOSITORY)
    private readonly candlesRepository: MarketCandlesRepository,
    @Inject(TOKENS.STRATEGIES_REPOSITORY)
    private readonly strategiesRepository: StrategiesRepository,
    @Inject(TOKENS.BACKTEST_RUNS_REPOSITORY)
    private readonly backtestRunsRepository: BacktestRunsRepository,
  ) {}

  async execute(input: RunBacktestDto) {
    const startDate = new Date(input.startDate);
    const endDate = new Date(input.endDate);
    if (startDate >= endDate) {
      throw new BadRequestException('startDate must be before endDate');
    }

    const instrument = await this.instrumentsService.findById(input.instrumentId);
    const strategyName = input.strategyId ?? DEFAULT_STRATEGY_NAME;
    const strategy = await this.strategiesRepository.findActiveByName(strategyName);
    if (!strategy) {
      throw new NotFoundException('Active strategy not found');
    }

    const candles = await this.candlesRepository.findMany({
      instrumentId: input.instrumentId,
      timeframe: input.timeframe,
      from: startDate,
      to: endDate,
      order: 'asc',
    });

    if (candles.length < MIN_BACKTEST_CANDLES) {
      throw new BadRequestException(`Backtest requires at least ${MIN_BACKTEST_CANDLES} candles`);
    }

    const run = await this.backtestRunsRepository.createRun({
      strategyId: strategy.id,
      strategyVersionId: strategy.activeVersion?.id ?? null,
      instrumentId: input.instrumentId,
      timeframe: input.timeframe,
      startDate,
      endDate,
      initialBalance: input.initialBalance,
    });

    try {
      const result = await this.engine.run({
        backtestRunId: run.id,
        strategy,
        instrumentId: input.instrumentId,
        symbol: instrument.symbol,
        timeframe: input.timeframe,
        initialBalance: input.initialBalance,
        riskPercent: input.riskPercent,
        useSupportResistanceFilter: input.useSupportResistanceFilter,
        useMarketRegimeFilter: input.useMarketRegimeFilter,
        useMultiTimeframeConfirmation: input.useMultiTimeframeConfirmation,
        candles,
      });

      await this.backtestRunsRepository.createTrades(result.trades);
      const completedRun = await this.backtestRunsRepository.completeRun(run.id, result.metrics);

      return {
        backtestId: completedRun.id,
        status: completedRun.status,
        metrics: {
          totalTrades: completedRun.totalTrades,
          winningTrades: completedRun.winningTrades,
          losingTrades: completedRun.losingTrades,
          winRate: completedRun.winRate,
          grossProfit: completedRun.grossProfit,
          grossLoss: completedRun.grossLoss,
          profitFactor: completedRun.profitFactor,
          maxDrawdown: completedRun.maxDrawdown,
          netPnL: completedRun.netPnL,
          averageWin: completedRun.averageWin,
          averageLoss: completedRun.averageLoss,
          finalBalance: completedRun.finalBalance,
          signalsBeforeFilters: completedRun.signalsBeforeFilters,
          signalsAfterFilters: completedRun.signalsAfterFilters,
          filteredSignals: completedRun.filteredSignals,
          filterReasons: completedRun.filterReasons,
        },
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await this.backtestRunsRepository.failRun(run.id, message);
      throw error;
    }
  }
}
