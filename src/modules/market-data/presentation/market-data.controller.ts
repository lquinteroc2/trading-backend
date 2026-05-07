import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Roles } from '@/modules/auth/presentation/decorators/roles.decorator';
import { MarketDataService } from '../application/market-data.service';
import { BulkMarketCandlesDto } from './dto/bulk-market-candles.dto';
import { CreateMarketCandleDto } from './dto/create-market-candle.dto';
import { FindCandlesDto } from './dto/find-candles.dto';

@ApiTags('market-data')
@Controller('market-data')
export class MarketDataController {
  constructor(private readonly marketDataService: MarketDataService) {}

  @Post('candles')
  @Roles(Role.ADMIN, Role.TRADER)
  createCandle(@Body() dto: CreateMarketCandleDto) {
    return this.marketDataService.createCandle({
      ...dto,
      timestamp: new Date(dto.timestamp),
    });
  }

  @Post('candles/bulk')
  @Roles(Role.ADMIN, Role.TRADER)
  createBulk(@Body() dto: BulkMarketCandlesDto) {
    return this.marketDataService.createBulk(
      dto.candles.map((candle) => ({ ...candle, timestamp: new Date(candle.timestamp) })),
    );
  }

  @Get('candles')
  @Roles(Role.ADMIN, Role.TRADER, Role.VIEWER)
  findCandles(@Query() query: FindCandlesDto) {
    return this.marketDataService.findCandles({
      instrumentId: query.instrumentId,
      timeframe: query.timeframe,
      from: query.from ? new Date(query.from) : undefined,
      to: query.to ? new Date(query.to) : undefined,
      limit: query.limit,
      order: query.order,
    });
  }
}
