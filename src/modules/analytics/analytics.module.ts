import { Module } from '@nestjs/common';
import { AnalyticsService } from './application/analytics.service';
import { CsvExportService } from './application/csv-export.service';
import { MetricsCalculatorService } from './application/metrics-calculator.service';
import { PrismaTradeAnalyticsSource } from './infrastructure/prisma-trade-analytics.source';
import { AnalyticsController } from './presentation/analytics.controller';

@Module({
  controllers: [AnalyticsController],
  providers: [
    AnalyticsService,
    CsvExportService,
    MetricsCalculatorService,
    PrismaTradeAnalyticsSource,
  ],
  exports: [AnalyticsService, CsvExportService, MetricsCalculatorService],
})
export class AnalyticsModule {}
