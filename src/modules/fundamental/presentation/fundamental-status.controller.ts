import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Roles } from '@/modules/auth/presentation/decorators/roles.decorator';
import { FundamentalAgentService } from '../application/fundamental-agent.service';
import { FundamentalStatusDto } from './dto/fundamental-status.dto';

@ApiTags('fundamental')
@Controller('fundamental')
export class FundamentalStatusController {
  constructor(private readonly fundamentalAgent: FundamentalAgentService) {}

  @Get('status')
  @Roles(Role.ADMIN, Role.TRADER, Role.VIEWER)
  status(@Query() query: FundamentalStatusDto) {
    return this.fundamentalAgent.getStatus(query.currency);
  }
}
