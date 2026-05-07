import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Roles } from '@/modules/auth/presentation/decorators/roles.decorator';
import { PaperTradingEngineService } from '../application/paper-trading-engine.service';
import { PaperTradingService } from '../application/paper-trading.service';
import { ClosePaperTradeDto } from './dto/close-paper-trade.dto';
import { CreatePaperAccountDto } from './dto/create-paper-account.dto';
import { EvaluateCandleDto } from './dto/evaluate-candle.dto';
import { FindPaperTradesDto } from './dto/find-paper-trades.dto';
import { OpenPaperTradeDto } from './dto/open-paper-trade.dto';

@ApiTags('paper-trading')
@Controller('paper-trading')
export class PaperTradingController {
  constructor(
    private readonly paperTradingService: PaperTradingService,
    private readonly engine: PaperTradingEngineService,
  ) {}

  @Post('accounts')
  @Roles(Role.ADMIN, Role.TRADER)
  createAccount(@Body() dto: CreatePaperAccountDto) {
    return this.engine.createAccount(dto);
  }

  @Get('accounts')
  @Roles(Role.ADMIN, Role.TRADER, Role.VIEWER)
  findAccounts() {
    return this.engine.findAccounts();
  }

  @Get('accounts/:id')
  @Roles(Role.ADMIN, Role.TRADER, Role.VIEWER)
  findAccount(@Param('id') id: string) {
    return this.engine.findAccountById(id);
  }

  @Post('trades/open')
  @Roles(Role.ADMIN, Role.TRADER)
  openTrade(@Body() dto: OpenPaperTradeDto) {
    return this.engine.openTradeFromSignal(dto.signalId, dto.accountId);
  }

  @Get('trades')
  @Roles(Role.ADMIN, Role.TRADER, Role.VIEWER)
  findMany(@Query() query: FindPaperTradesDto) {
    return this.paperTradingService.findMany(query);
  }

  @Get('trades/:id')
  @Roles(Role.ADMIN, Role.TRADER, Role.VIEWER)
  findOne(@Param('id') id: string) {
    return this.paperTradingService.findById(id);
  }

  @Patch('trades/:id/close')
  @Roles(Role.ADMIN, Role.TRADER)
  close(@Param('id') id: string, @Body() dto: ClosePaperTradeDto) {
    return this.paperTradingService.close(id, dto.closePrice, dto.closeReason);
  }

  @Post('evaluate-candle')
  @Roles(Role.ADMIN, Role.TRADER)
  evaluateCandle(@Body() dto: EvaluateCandleDto) {
    return this.engine.evaluateOpenTradesOnCandleId(dto.candleId);
  }
}
