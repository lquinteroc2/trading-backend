import { Module } from '@nestjs/common';
import { EconomicEventsModule } from '@/modules/economic-events/economic-events.module';
import { FundamentalAgentService } from './application/fundamental-agent.service';
import { FundamentalAgentController } from './presentation/fundamental-agent.controller';
import { FundamentalStatusController } from './presentation/fundamental-status.controller';

@Module({
  imports: [EconomicEventsModule],
  controllers: [FundamentalAgentController, FundamentalStatusController],
  providers: [FundamentalAgentService],
  exports: [FundamentalAgentService],
})
export class FundamentalModule {}
