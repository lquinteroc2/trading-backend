import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { SignalStatus } from '@prisma/client';
import { TOKENS } from '@/shared/tokens';
import {
  CreateTradingSignalData,
  FindSignalsQuery,
  TradingSignalsRepository,
} from '../domain/trading-signals.repository';

@Injectable()
export class SignalsService {
  constructor(
    @Inject(TOKENS.SIGNALS_REPOSITORY)
    private readonly signalsRepository: TradingSignalsRepository,
  ) {}

  create(data: CreateTradingSignalData) {
    return this.signalsRepository.create(data);
  }

  findMany(query: FindSignalsQuery) {
    return this.signalsRepository.findMany(query);
  }

  async findById(id: string) {
    const signal = await this.signalsRepository.findById(id);
    if (!signal) {
      throw new NotFoundException('Signal not found');
    }
    return signal;
  }

  async updateStatus(id: string, status: SignalStatus) {
    await this.findById(id);
    return this.signalsRepository.updateStatus(id, status);
  }
}
