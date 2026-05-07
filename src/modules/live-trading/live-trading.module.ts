import { Module } from '@nestjs/common';
import { BrokerModule } from '@/modules/broker/broker.module';
import { SystemModule } from '@/modules/system/system.module';
import { LiveTradingGuardService } from './application/live-trading-guard.service';
import { LiveTradingService } from './application/live-trading.service';
import { LiveTradingController } from './presentation/live-trading.controller';

@Module({
  imports: [SystemModule, BrokerModule],
  controllers: [LiveTradingController],
  providers: [LiveTradingGuardService, LiveTradingService],
  exports: [LiveTradingGuardService, LiveTradingService],
})
export class LiveTradingModule {}
