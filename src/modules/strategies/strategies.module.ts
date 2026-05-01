import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { QUEUE_NAMES } from '@/queues/queue.constants';
import { QueuesModule } from '@/queues/queues.module';
import { TOKENS } from '@/shared/tokens';
import { PrismaAgentDecisionsRepository } from '../agents/infrastructure/prisma-agent-decisions.repository';
import { InstrumentsModule } from '../instruments/instruments.module';
import { PrismaMarketCandlesRepository } from '../market-data/infrastructure/prisma-market-candles.repository';
import { SignalsModule } from '../signals/signals.module';
import { EmaTrendStrategyService } from './application/ema-trend-strategy.service';
import { SignalGenerationService } from './application/signal-generation.service';
import { StrategyEngineService } from './application/strategy-engine.service';
import { PrismaStrategiesRepository } from './infrastructure/prisma-strategies.repository';
import { SignalGenerationProcessor } from './infrastructure/signal-generation.processor';
import { SignalGenerationController } from './presentation/signal-generation.controller';

@Module({
  imports: [
    InstrumentsModule,
    SignalsModule,
    QueuesModule,
    BullModule.registerQueue({ name: QUEUE_NAMES.SIGNAL_GENERATION }),
  ],
  controllers: [SignalGenerationController],
  providers: [
    EmaTrendStrategyService,
    SignalGenerationService,
    StrategyEngineService,
    SignalGenerationProcessor,
    { provide: TOKENS.STRATEGIES_REPOSITORY, useClass: PrismaStrategiesRepository },
    { provide: TOKENS.AGENT_DECISIONS_REPOSITORY, useClass: PrismaAgentDecisionsRepository },
    { provide: TOKENS.MARKET_CANDLES_REPOSITORY, useClass: PrismaMarketCandlesRepository },
  ],
  exports: [SignalGenerationService, StrategyEngineService, TOKENS.STRATEGIES_REPOSITORY],
})
export class StrategiesModule {}
