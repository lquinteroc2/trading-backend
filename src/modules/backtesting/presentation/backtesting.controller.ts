import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { BacktestingService } from '../application/backtesting.service';
import { RunBacktestUseCase } from '../application/run-backtest.use-case';
import { FindBacktestsDto } from './dto/find-backtests.dto';
import { RunBacktestDto } from './dto/run-backtest.dto';

@ApiTags('backtesting')
@Controller('backtesting')
export class BacktestingController {
  constructor(
    private readonly runBacktest: RunBacktestUseCase,
    private readonly backtestingService: BacktestingService,
  ) {}

  @Post('run')
  run(@Body() dto: RunBacktestDto) {
    return this.runBacktest.execute(dto);
  }

  @Get()
  findMany(@Query() query: FindBacktestsDto) {
    return this.backtestingService.findMany(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.backtestingService.findById(id);
  }

  @Get(':id/trades')
  findTrades(@Param('id') id: string) {
    return this.backtestingService.findTrades(id);
  }
}
