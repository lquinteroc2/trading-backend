import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Role, SupervisorDecisionAction, SystemMode } from '@prisma/client';
import { PaperTradingQueueProducer } from '@/queues/paper-trading-queue.producer';
import { SupervisorDecisionQueueProducer } from '@/queues/supervisor-decision-queue.producer';
import { Roles } from '@/modules/auth/presentation/decorators/roles.decorator';
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
  @Roles(Role.ADMIN, Role.TRADER)
  async decide(@Body() dto: SupervisorDecideDto) {
    const result = await this.supervisorAgent.decideSignalById(dto.signalId);
    if (
      result.supervisorDecision.decision === SupervisorDecisionAction.OPERATE &&
      result.systemMode === SystemMode.PAPER_TRADING
    ) {
      await this.paperTradingQueueProducer.enqueueOpenTrade({ signalId: dto.signalId });
    }
    return result;
  }

  @Post('decide/enqueue')
  @Roles(Role.ADMIN, Role.TRADER)
  enqueue(@Body() dto: SupervisorDecideDto) {
    return this.supervisorDecisionQueueProducer.enqueue(dto.signalId);
  }

  @Get('decisions')
  @Roles(Role.ADMIN, Role.TRADER, Role.VIEWER)
  findDecisions() {
    return this.supervisorAgent.findDecisions();
  }

  @Get('decisions/:id')
  @Roles(Role.ADMIN, Role.TRADER, Role.VIEWER)
  findDecisionById(@Param('id') id: string) {
    return this.supervisorAgent.findDecisionById(id);
  }
}
