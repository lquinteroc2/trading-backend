import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { QUEUE_NAMES } from '@/queues/queue.constants';
import { QueuesModule } from '@/queues/queues.module';
import { TOKENS } from '@/shared/tokens';
import { PrismaAgentDecisionsRepository } from '../agents/infrastructure/prisma-agent-decisions.repository';
import { SignalsModule } from '../signals/signals.module';
import { AccountStateService } from './application/account-state.service';
import { CalculatePositionSizeUseCase } from './application/calculate-position-size.use-case';
import { RiskAgentService } from './application/risk-agent.service';
import { PrismaRiskAssessmentsRepository } from './infrastructure/prisma-risk-assessments.repository';
import { PrismaRiskProfilesRepository } from './infrastructure/prisma-risk-profiles.repository';
import { RiskEvaluationProcessor } from './infrastructure/risk-evaluation.processor';
import { RiskAgentController } from './presentation/risk-agent.controller';
import { RiskController } from './presentation/risk.controller';

@Module({
  imports: [
    SignalsModule,
    QueuesModule,
    BullModule.registerQueue({ name: QUEUE_NAMES.RISK_EVALUATION }),
  ],
  controllers: [RiskController, RiskAgentController],
  providers: [
    CalculatePositionSizeUseCase,
    RiskAgentService,
    AccountStateService,
    RiskEvaluationProcessor,
    { provide: TOKENS.RISK_PROFILES_REPOSITORY, useClass: PrismaRiskProfilesRepository },
    { provide: TOKENS.RISK_ASSESSMENTS_REPOSITORY, useClass: PrismaRiskAssessmentsRepository },
    { provide: TOKENS.AGENT_DECISIONS_REPOSITORY, useClass: PrismaAgentDecisionsRepository },
  ],
  exports: [CalculatePositionSizeUseCase, RiskAgentService],
})
export class RiskModule {}
