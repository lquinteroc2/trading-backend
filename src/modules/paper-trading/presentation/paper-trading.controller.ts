import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PaperTradingService } from '../application/paper-trading.service';
import { ClosePaperTradeDto } from './dto/close-paper-trade.dto';
import { CreatePaperTradeDto } from './dto/create-paper-trade.dto';

@ApiTags('paper-trades')
@Controller('paper-trades')
export class PaperTradingController {
  constructor(private readonly paperTradingService: PaperTradingService) {}

  @Post()
  create(@Body() dto: CreatePaperTradeDto) {
    return this.paperTradingService.create(dto);
  }

  @Get()
  findMany() {
    return this.paperTradingService.findMany();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.paperTradingService.findById(id);
  }

  @Patch(':id/close')
  close(@Param('id') id: string, @Body() dto: ClosePaperTradeDto) {
    return this.paperTradingService.close(id, dto.closePrice);
  }
}
