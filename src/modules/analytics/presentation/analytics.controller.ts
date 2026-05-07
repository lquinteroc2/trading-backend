import { Controller, Get, Header, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '@/modules/auth/presentation/guards/jwt-auth.guard';
import { RolesGuard } from '@/modules/auth/presentation/guards/roles.guard';
import { Roles } from '@/modules/auth/presentation/decorators/roles.decorator';
import { AnalyticsService } from '../application/analytics.service';
import { CsvExportService } from '../application/csv-export.service';
import { AnalyticsExportQueryDto, AnalyticsQueryDto } from './dto/analytics-query.dto';

@ApiTags('analytics')
@ApiBearerAuth()
@Controller('analytics')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AnalyticsController {
  constructor(
    private readonly analytics: AnalyticsService,
    private readonly csv: CsvExportService,
  ) {}

  @Get('summary')
  @Roles(Role.ADMIN, Role.TRADER, Role.VIEWER)
  summary(@Query() query: AnalyticsQueryDto) {
    return this.analytics.summary(this.toFilters(query));
  }

  @Get('daily')
  @Roles(Role.ADMIN, Role.TRADER, Role.VIEWER)
  daily(@Query() query: AnalyticsQueryDto) {
    return this.analytics.grouped(this.toFilters(query), 'DAY');
  }

  @Get('weekly')
  @Roles(Role.ADMIN, Role.TRADER, Role.VIEWER)
  weekly(@Query() query: AnalyticsQueryDto) {
    return this.analytics.grouped(this.toFilters(query), 'WEEK');
  }

  @Get('by-strategy')
  @Roles(Role.ADMIN, Role.TRADER, Role.VIEWER)
  byStrategy(@Query() query: AnalyticsQueryDto) {
    return this.analytics.grouped(this.toFilters(query), 'STRATEGY');
  }

  @Get('by-symbol')
  @Roles(Role.ADMIN, Role.TRADER, Role.VIEWER)
  bySymbol(@Query() query: AnalyticsQueryDto) {
    return this.analytics.grouped(this.toFilters(query), 'SYMBOL');
  }

  @Get('by-timeframe')
  @Roles(Role.ADMIN, Role.TRADER, Role.VIEWER)
  byTimeframe(@Query() query: AnalyticsQueryDto) {
    return this.analytics.grouped(this.toFilters(query), 'TIMEFRAME');
  }

  @Get('equity-curve')
  @Roles(Role.ADMIN, Role.TRADER, Role.VIEWER)
  equityCurve(@Query() query: AnalyticsQueryDto) {
    return this.analytics.equityCurve(this.toFilters(query));
  }

  @Get('export.csv')
  @Roles(Role.ADMIN, Role.TRADER)
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @Header('Content-Disposition', 'attachment; filename="analytics-export.csv"')
  exportCsv(@Query() query: AnalyticsExportQueryDto) {
    return this.csv.export(query.type, this.toFilters(query));
  }

  private toFilters(query: AnalyticsQueryDto) {
    return {
      executionType: query.executionType,
      instrumentId: query.instrumentId,
      symbol: query.symbol,
      strategyId: query.strategyId,
      timeframe: query.timeframe,
      from: query.from ? new Date(query.from) : undefined,
      to: query.to ? new Date(query.to) : undefined,
    };
  }
}
