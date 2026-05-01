import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { RiskEvaluationQueueProducer } from '@/queues/risk-evaluation-queue.producer';
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
  evaluate(@Body() dto: EvaluateRiskDto) {
    return this.riskAgent.evaluateSignalById(dto.signalId);
  }

  @Post('evaluate/enqueue')
  enqueue(@Body() dto: EvaluateRiskDto) {
    return this.riskEvaluationQueueProducer.enqueue(dto.signalId);
  }

  @Get('assessments')
  findAssessments() {
    return this.riskAgent.findAssessments();
  }
}
