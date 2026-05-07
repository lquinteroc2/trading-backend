import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { RiskEvaluationQueueProducer } from '@/queues/risk-evaluation-queue.producer';
import { Roles } from '@/modules/auth/presentation/decorators/roles.decorator';
import { RiskAgentService } from '../application/risk-agent.service';
import { EvaluateRiskDto } from './dto/evaluate-risk.dto';

@ApiTags('agents')
@Controller('agents/risk')
export class RiskAgentController {
  constructor(
    private readonly riskAgent: RiskAgentService,
    private readonly riskEvaluationQueueProducer: RiskEvaluationQueueProducer,
  ) {}

  @Post('evaluate')
  @Roles(Role.ADMIN, Role.TRADER)
  evaluate(@Body() dto: EvaluateRiskDto) {
    return this.riskAgent.evaluateSignalById(dto.signalId);
  }

  @Post('evaluate/enqueue')
  @Roles(Role.ADMIN, Role.TRADER)
  enqueue(@Body() dto: EvaluateRiskDto) {
    return this.riskEvaluationQueueProducer.enqueue(dto.signalId);
  }

  @Get('assessments')
  @Roles(Role.ADMIN, Role.TRADER, Role.VIEWER)
  findAssessments() {
    return this.riskAgent.findAssessments();
  }
}
