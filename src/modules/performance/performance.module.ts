import { Module } from '@nestjs/common';
import { PerformanceSummaryService } from './application/performance-summary.service';
import { PerformanceController } from './presentation/performance.controller';

@Module({
  controllers: [PerformanceController],
  providers: [PerformanceSummaryService],
})
export class PerformanceModule {}
