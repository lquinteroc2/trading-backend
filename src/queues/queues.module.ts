import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
import { InstrumentsModule } from '@/modules/instruments/instruments.module';
import { QUEUE_NAMES } from './queue.constants';
import { AgentDecisionProcessor, MarketDataProcessor } from './processors';
import { QueuesController } from './queues.controller';
import { RiskEvaluationQueueProducer } from './risk-evaluation-queue.producer';
import { SignalGenerationQueueProducer } from './signal-generation-queue.producer';
import { TechnicalAnalysisQueueProducer } from './technical-analysis-queue.producer';
import { PaperTradingQueueProducer } from './paper-trading-queue.producer';

const queueRegistrations = Object.values(QUEUE_NAMES).map((name) =>
  BullModule.registerQueue({ name }),
);

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
    RiskEvaluationQueueProducer,
    PaperTradingQueueProducer,
    TechnicalAnalysisQueueProducer,
    SignalGenerationQueueProducer,
  ],
  exports: [
    BullModule,
    TechnicalAnalysisQueueProducer,
    SignalGenerationQueueProducer,
    RiskEvaluationQueueProducer,
    PaperTradingQueueProducer,
  ],
})
export class QueuesModule {}
