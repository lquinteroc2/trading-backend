import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { QUEUE_NAMES } from '@/queues/queue.constants';
import { TOKENS } from '@/shared/tokens';
import { InstrumentsModule } from '../instruments/instruments.module';
import { PrismaMarketCandlesRepository } from '../market-data/infrastructure/prisma-market-candles.repository';
import { GetLatestTechnicalAnalysisUseCase } from './application/get-latest-technical-analysis.use-case';
import { AgentsService } from './application/agents.service';
import { TechnicalAnalyzeUseCase } from './application/technical-analyze.use-case';
import { PrismaAgentDecisionsRepository } from './infrastructure/prisma-agent-decisions.repository';
import { PythonTechnicalAnalysisProvider } from './infrastructure/python-technical-analysis.provider';
import { TechnicalAnalysisProcessor } from './infrastructure/technical-analysis.processor';
import { AgentsController } from './presentation/agents.controller';

@Module({
  imports: [InstrumentsModule, BullModule.registerQueue({ name: QUEUE_NAMES.TECHNICAL_ANALYSIS })],
  controllers: [AgentsController],
  providers: [
    AgentsService,
    TechnicalAnalyzeUseCase,
    GetLatestTechnicalAnalysisUseCase,
    PythonTechnicalAnalysisProvider,
    TechnicalAnalysisProcessor,
    { provide: TOKENS.AGENT_DECISIONS_REPOSITORY, useClass: PrismaAgentDecisionsRepository },
    { provide: TOKENS.MARKET_CANDLES_REPOSITORY, useClass: PrismaMarketCandlesRepository },
    { provide: TOKENS.TECHNICAL_ANALYSIS_PROVIDER, useClass: PythonTechnicalAnalysisProvider },
  ],
})
export class AgentsModule {}
