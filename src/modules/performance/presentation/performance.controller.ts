import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PerformanceSummaryService } from '../application/performance-summary.service';

@ApiTags('performance')
@Controller('performance')
export class PerformanceController {
  constructor(private readonly performance: PerformanceSummaryService) {}

  @Get('summary')
  summary() {
    return this.performance.getSummary();
  }
}
