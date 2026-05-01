import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
import { QUEUE_NAMES } from './queue.constants';
import {
  AgentDecisionProcessor,
  MarketDataProcessor,
  PaperTradingProcessor,
  SignalGenerationProcessor,
} from './processors';

const queueRegistrations = Object.values(QUEUE_NAMES).map((name) => BullModule.registerQueue({ name }));

@Module({
  imports: [
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: {
          host: config.get<string>('redis.host'),
          port: config.get<number>('redis.port'),
          password: config.get<string>('redis.password'),
        },
      }),
    }),
    ...queueRegistrations,
  ],
  providers: [
    MarketDataProcessor,
    SignalGenerationProcessor,
    AgentDecisionProcessor,
    PaperTradingProcessor,
  ],
  exports: [BullModule],
})
export class QueuesModule {}
