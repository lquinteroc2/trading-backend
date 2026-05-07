import { Module } from '@nestjs/common';
import { QueuesModule } from '@/queues/queues.module';
import { BrokerModule } from '@/modules/broker/broker.module';
import { SystemModule } from '@/modules/system/system.module';
import { AssistedTradingService } from './application/assisted-trading.service';
import { AssistedTradingController } from './presentation/assisted-trading.controller';

@Module({
  imports: [SystemModule, QueuesModule, BrokerModule],
  controllers: [AssistedTradingController],
  providers: [AssistedTradingService],
  exports: [AssistedTradingService],
})
export class AssistedTradingModule {}
