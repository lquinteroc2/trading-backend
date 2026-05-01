import { Module } from '@nestjs/common';
import { TOKENS } from '@/shared/tokens';
import { PaperTradingService } from './application/paper-trading.service';
import { PrismaPaperTradesRepository } from './infrastructure/prisma-paper-trades.repository';
import { PaperTradingController } from './presentation/paper-trading.controller';

@Module({
  controllers: [PaperTradingController],
  providers: [
    PaperTradingService,
    { provide: TOKENS.PAPER_TRADES_REPOSITORY, useClass: PrismaPaperTradesRepository },
  ],
})
export class PaperTradingModule {}
