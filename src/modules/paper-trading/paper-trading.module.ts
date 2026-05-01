import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { QUEUE_NAMES } from '@/queues/queue.constants';
import { TOKENS } from '@/shared/tokens';
import { SignalsModule } from '../signals/signals.module';
import { PaperTradingEngineService } from './application/paper-trading-engine.service';
import { PaperTradingService } from './application/paper-trading.service';
import { PaperTradingProcessor } from './infrastructure/paper-trading.processor';
import { PrismaPaperTradingAccountsRepository } from './infrastructure/prisma-paper-trading-accounts.repository';
import { PrismaPaperTradesRepository } from './infrastructure/prisma-paper-trades.repository';
import { PaperTradingController } from './presentation/paper-trading.controller';

@Module({
  imports: [SignalsModule, BullModule.registerQueue({ name: QUEUE_NAMES.PAPER_TRADING })],
  controllers: [PaperTradingController],
  providers: [
    PaperTradingEngineService,
    PaperTradingService,
    PaperTradingProcessor,
    { provide: TOKENS.PAPER_TRADES_REPOSITORY, useClass: PrismaPaperTradesRepository },
    {
      provide: TOKENS.PAPER_TRADING_ACCOUNTS_REPOSITORY,
      useClass: PrismaPaperTradingAccountsRepository,
    },
  ],
  exports: [PaperTradingEngineService],
})
export class PaperTradingModule {}
