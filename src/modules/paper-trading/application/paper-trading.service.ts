import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { PaperTradeResult, PaperTradeStatus, TradeDirection } from '@prisma/client';
import { TOKENS } from '@/shared/tokens';
import {
  CreatePaperTradeData,
  PaperTradesRepository,
} from '../domain/paper-trades.repository';

@Injectable()
export class PaperTradingService {
  constructor(
    @Inject(TOKENS.PAPER_TRADES_REPOSITORY)
    private readonly paperTradesRepository: PaperTradesRepository,
  ) {}

  create(data: CreatePaperTradeData) {
    return this.paperTradesRepository.create(data);
  }

  findMany() {
    return this.paperTradesRepository.findMany();
  }

  async findById(id: string) {
    const trade = await this.paperTradesRepository.findById(id);
    if (!trade) {
      throw new NotFoundException('Paper trade not found');
    }
    return trade;
  }

  async close(id: string, closePrice: number) {
    const trade = await this.findById(id);
    if (trade.status !== PaperTradeStatus.OPEN) {
      throw new BadRequestException('Only open paper trades can be closed');
    }

    const signedDistance =
      trade.direction === TradeDirection.BUY
        ? closePrice - trade.entryPrice
        : trade.entryPrice - closePrice;
    const pnl = signedDistance * trade.positionSize;
    const exposure = trade.entryPrice * trade.positionSize;
    const pnlPercent = exposure === 0 ? 0 : (pnl / exposure) * 100;
    const result =
      pnl > 0 ? PaperTradeResult.WIN : pnl < 0 ? PaperTradeResult.LOSS : PaperTradeResult.BREAKEVEN;

    return this.paperTradesRepository.close(id, {
      status: PaperTradeStatus.CLOSED,
      closedAt: new Date(),
      closePrice,
      pnl,
      pnlPercent,
      result,
    });
  }
}
