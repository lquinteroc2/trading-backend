import { Inject, Injectable, NotFoundException, Optional } from '@nestjs/common';
import { SignalStatus } from '@prisma/client';
import { InternalEventBus } from '@/events/internal-event-bus.service';
import { TRADING_EVENTS } from '@/events/trading-events';
import { TOKENS } from '@/shared/tokens';
import {
  CreateTradingSignalData,
  FindSignalsQuery,
  SignalCandleKey,
  TradingSignalsRepository,
} from '../domain/trading-signals.repository';

@Injectable()
export class SignalsService {
  constructor(
    @Inject(TOKENS.SIGNALS_REPOSITORY)
    private readonly signalsRepository: TradingSignalsRepository,
    @Optional()
    private readonly eventBus?: InternalEventBus,
  ) {}

  async create(data: CreateTradingSignalData) {
    const signal = await this.signalsRepository.create(data);
    this.eventBus?.emit(TRADING_EVENTS.SIGNAL_CREATED, {
      signalId: signal.id,
      instrumentId: signal.instrumentId,
      timeframe: signal.timeframe,
    });
    return signal;
  }

  findMany(query: FindSignalsQuery) {
    return this.signalsRepository.findMany(query);
  }

  findByCandleKey(key: SignalCandleKey) {
    return this.signalsRepository.findByCandleKey(key);
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
    const signal = await this.signalsRepository.updateStatus(id, status);
    this.eventBus?.emit(TRADING_EVENTS.SIGNAL_STATUS_UPDATED, {
      signalId: signal.id,
      status: signal.status,
    });
    return signal;
  }
}
