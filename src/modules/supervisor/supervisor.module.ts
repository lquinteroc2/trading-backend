import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { QUEUE_NAMES } from '@/queues/queue.constants';
import { QueuesModule } from '@/queues/queues.module';
import { SignalsModule } from '../signals/signals.module';
import { SystemModule } from '../system/system.module';
import { FundamentalModule } from '../fundamental/fundamental.module';
import { AssistedTradingModule } from '../assisted-trading/assisted-trading.module';
import { SupervisorAgentService } from './application/supervisor-agent.service';
import { SupervisorDecisionProcessor } from './infrastructure/supervisor-decision.processor';
import { SupervisorAgentController } from './presentation/supervisor-agent.controller';

@Module({
  imports: [
    SignalsModule,
    SystemModule,
    FundamentalModule,
    AssistedTradingModule,
    QueuesModule,
    BullModule.registerQueue({ name: QUEUE_NAMES.SUPERVISOR_DECISION }),
  ],
  controllers: [SupervisorAgentController],
  providers: [SupervisorAgentService, SupervisorDecisionProcessor],
  exports: [SupervisorAgentService],
})
export class SupervisorModule {}
