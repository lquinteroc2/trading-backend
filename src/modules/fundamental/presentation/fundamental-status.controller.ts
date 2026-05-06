import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { FundamentalAgentService } from '../application/fundamental-agent.service';
import { FundamentalStatusDto } from './dto/fundamental-status.dto';

@ApiTags('fundamental')
@Controller('fundamental')
export class FundamentalStatusController {
  constructor(private readonly fundamentalAgent: FundamentalAgentService) {}

  @Get('status')
  status(@Query() query: FundamentalStatusDto) {
    return this.fundamentalAgent.getStatus(query.currency);
  }
}
