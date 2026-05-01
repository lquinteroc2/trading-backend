import { BadRequestException, Injectable } from '@nestjs/common';
import { PaperTradeCloseReason } from '@prisma/client';
import { CreatePaperTradeData, FindPaperTradesQuery } from '../domain/paper-trades.repository';
import { PaperTradingEngineService } from './paper-trading-engine.service';

@Injectable()
export class PaperTradingService {
  constructor(private readonly engine: PaperTradingEngineService) {}

  create(data: CreatePaperTradeData) {
    if (!data.signalId) {
      throw new BadRequestException('signalId is required to open a paper trade');
    }
    return this.engine.openTradeFromSignal(data.signalId, data.accountId);
  }

  findMany(query: FindPaperTradesQuery = {}) {
    return this.engine.findTrades(query);
  }

  async findById(id: string) {
    return this.engine.findTradeById(id);
  }

  async close(
    id: string,
    closePrice: number,
    closeReason: PaperTradeCloseReason = PaperTradeCloseReason.MANUAL,
  ) {
    return this.engine.closeTrade(id, closePrice, closeReason);
  }
}
