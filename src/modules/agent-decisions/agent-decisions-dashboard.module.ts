import { Module } from '@nestjs/common';
import { AgentDecisionsDashboardController } from './presentation/agent-decisions.controller';

@Module({
  controllers: [AgentDecisionsDashboardController],
})
export class AgentDecisionsDashboardModule {}
