import { Body, Controller, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Roles } from '@/modules/auth/presentation/decorators/roles.decorator';
import { FundamentalAgentService } from '../application/fundamental-agent.service';
import { EvaluateFundamentalDto } from './dto/evaluate-fundamental.dto';

@ApiTags('agents')
@Controller('agents/fundamental')
export class FundamentalAgentController {
  constructor(private readonly fundamentalAgent: FundamentalAgentService) {}

  @Post('evaluate')
  @Roles(Role.ADMIN, Role.TRADER)
  evaluate(@Body() dto: EvaluateFundamentalDto) {
    return this.fundamentalAgent.evaluate({
      currency: dto.currency,
      timestamp: new Date(dto.timestamp),
    });
  }
}
