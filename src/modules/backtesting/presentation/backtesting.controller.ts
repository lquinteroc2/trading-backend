import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Roles } from '@/modules/auth/presentation/decorators/roles.decorator';
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
  @Roles(Role.ADMIN, Role.TRADER)
  run(@Body() dto: RunBacktestDto) {
    return this.runBacktest.execute(dto);
  }

  @Get()
  @Roles(Role.ADMIN, Role.TRADER, Role.VIEWER)
  findMany(@Query() query: FindBacktestsDto) {
    return this.backtestingService.findMany(query);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.TRADER, Role.VIEWER)
  findOne(@Param('id') id: string) {
    return this.backtestingService.findById(id);
  }

  @Get(':id/trades')
  @Roles(Role.ADMIN, Role.TRADER, Role.VIEWER)
  findTrades(@Param('id') id: string) {
    return this.backtestingService.findTrades(id);
  }
}
