import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { SupervisorDecisionAction } from '@prisma/client';
import { PaperTradingQueueProducer } from '@/queues/paper-trading-queue.producer';
import { SupervisorDecisionQueueProducer } from '@/queues/supervisor-decision-queue.producer';
import { SupervisorAgentService } from '../application/supervisor-agent.service';
import { SupervisorDecideDto } from './dto/supervisor-decide.dto';

@ApiTags('agents')
@Controller('agents/supervisor')
export class SupervisorAgentController {
  constructor(
    private readonly supervisorAgent: SupervisorAgentService,
    private readonly supervisorDecisionQueueProducer: SupervisorDecisionQueueProducer,
    private readonly paperTradingQueueProducer: PaperTradingQueueProducer,
  ) {}

  @Post('decide')
  async decide(@Body() dto: SupervisorDecideDto) {
    const result = await this.supervisorAgent.decideSignalById(dto.signalId);
    if (result.supervisorDecision.decision === SupervisorDecisionAction.OPERATE) {
      await this.paperTradingQueueProducer.enqueueOpenTrade({ signalId: dto.signalId });
    }
    return result;
  }

  @Post('decide/enqueue')
  enqueue(@Body() dto: SupervisorDecideDto) {
    return this.supervisorDecisionQueueProducer.enqueue(dto.signalId);
  }

  @Get('decisions')
  findDecisions() {
    return this.supervisorAgent.findDecisions();
  }

  @Get('decisions/:id')
  findDecisionById(@Param('id') id: string) {
    return this.supervisorAgent.findDecisionById(id);
  }
}
