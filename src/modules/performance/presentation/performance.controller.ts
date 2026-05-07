import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Roles } from '@/modules/auth/presentation/decorators/roles.decorator';
import { PerformanceSummaryService } from '../application/performance-summary.service';

@ApiTags('performance')
@Controller('performance')
export class PerformanceController {
  constructor(private readonly performance: PerformanceSummaryService) {}

  @Get('summary')
  @Roles(Role.ADMIN, Role.TRADER, Role.VIEWER)
  summary() {
    return this.performance.getSummary();
  }
}
