import { Module } from '@nestjs/common';
import { TOKENS } from '@/shared/tokens';
import { AgentsService } from './application/agents.service';
import { PrismaAgentDecisionsRepository } from './infrastructure/prisma-agent-decisions.repository';
import { AgentsController } from './presentation/agents.controller';

@Module({
  controllers: [AgentsController],
  providers: [
    AgentsService,
    { provide: TOKENS.AGENT_DECISIONS_REPOSITORY, useClass: PrismaAgentDecisionsRepository },
  ],
})
export class AgentsModule {}
