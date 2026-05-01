import { Module } from '@nestjs/common';
import { TOKENS } from '@/shared/tokens';
import { InstrumentsModule } from '../instruments/instruments.module';
import { PrismaMarketCandlesRepository } from '../market-data/infrastructure/prisma-market-candles.repository';
import { StrategiesModule } from '../strategies/strategies.module';
import { BacktestingEngineService } from './application/backtesting-engine.service';
import { BacktestingIndicatorsService } from './application/backtesting-indicators.service';
import { BacktestingMetricsService } from './application/backtesting-metrics.service';
import { BacktestingService } from './application/backtesting.service';
import { RunBacktestUseCase } from './application/run-backtest.use-case';
import { PrismaBacktestRunsRepository } from './infrastructure/prisma-backtest-runs.repository';
import { BacktestingController } from './presentation/backtesting.controller';

@Module({
  imports: [InstrumentsModule, StrategiesModule],
  controllers: [BacktestingController],
  providers: [
    BacktestingEngineService,
    BacktestingIndicatorsService,
    BacktestingMetricsService,
    BacktestingService,
    RunBacktestUseCase,
    { provide: TOKENS.BACKTEST_RUNS_REPOSITORY, useClass: PrismaBacktestRunsRepository },
    { provide: TOKENS.MARKET_CANDLES_REPOSITORY, useClass: PrismaMarketCandlesRepository },
  ],
})
export class BacktestingModule {}
