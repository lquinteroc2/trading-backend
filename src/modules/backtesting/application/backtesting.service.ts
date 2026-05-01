import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { TOKENS } from '@/shared/tokens';
import { BacktestRunsRepository, FindBacktestRunsQuery } from '../domain/backtest-runs.repository';

@Injectable()
export class BacktestingService {
  constructor(
    @Inject(TOKENS.BACKTEST_RUNS_REPOSITORY)
    private readonly backtestRunsRepository: BacktestRunsRepository,
  ) {}

  findMany(query: FindBacktestRunsQuery) {
    return this.backtestRunsRepository.findRuns(query);
  }

  async findById(id: string) {
    const run = await this.backtestRunsRepository.findRunById(id);
    if (!run) {
      throw new NotFoundException('Backtest run not found');
    }
    return run;
  }

  async findTrades(id: string) {
    await this.findById(id);
    return this.backtestRunsRepository.findTradesByRunId(id);
  }
}
