import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
import { InstrumentsModule } from '@/modules/instruments/instruments.module';
import { QUEUE_NAMES } from './queue.constants';
import {
  AgentDecisionProcessor,
  MarketDataProcessor,
  PaperTradingProcessor,
} from './processors';
import { QueuesController } from './queues.controller';
import { SignalGenerationQueueProducer } from './signal-generation-queue.producer';
import { TechnicalAnalysisQueueProducer } from './technical-analysis-queue.producer';

const queueRegistrations = Object.values(QUEUE_NAMES).map((name) => BullModule.registerQueue({ name }));

@Module({
  imports: [
    InstrumentsModule,
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
  controllers: [QueuesController],
  providers: [
    MarketDataProcessor,
    AgentDecisionProcessor,
    PaperTradingProcessor,
    TechnicalAnalysisQueueProducer,
    SignalGenerationQueueProducer,
  ],
  exports: [BullModule, TechnicalAnalysisQueueProducer, SignalGenerationQueueProducer],
})
export class QueuesModule {}
