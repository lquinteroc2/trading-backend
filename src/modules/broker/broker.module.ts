import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { QUEUE_NAMES } from '@/queues/queue.constants';
import { SystemModule } from '@/modules/system/system.module';
import { BROKER_CONNECTOR } from './domain/broker-connector.interface';
import { BrokerService } from './application/broker.service';
import { Mt5BrokerConnector } from './infrastructure/mt5-broker.connector';
import { BrokerExecutionProcessor } from './infrastructure/broker-execution.processor';
import { BrokerController } from './presentation/broker.controller';

@Module({
  imports: [SystemModule, BullModule.registerQueue({ name: QUEUE_NAMES.BROKER_EXECUTION })],
  controllers: [BrokerController],
  providers: [
    BrokerService,
    BrokerExecutionProcessor,
    {
      provide: BROKER_CONNECTOR,
      useClass: Mt5BrokerConnector,
    },
  ],
  exports: [BrokerService],
})
export class BrokerModule {}
