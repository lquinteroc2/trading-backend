import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AgentsService } from '../application/agents.service';
import { CreateAgentDecisionDto } from './dto/create-agent-decision.dto';

@ApiTags('agents')
@Controller('agents')
export class AgentsController {
  constructor(private readonly agentsService: AgentsService) {}

  @Post('decisions')
  create(@Body() dto: CreateAgentDecisionDto) {
    return this.agentsService.createDecision(dto);
  }

  @Get('decisions')
  findMany() {
    return this.agentsService.findDecisions();
  }

  @Get('decisions/:id')
  findOne(@Param('id') id: string) {
    return this.agentsService.findDecisionById(id);
  }
}
