import { Injectable } from '@nestjs/common';
import { EconomicEvent } from '@prisma/client';
import { InternalEventBus } from '@/events/internal-event-bus.service';
import { TRADING_EVENTS } from '@/events/trading-events';
import { EconomicEventsService } from '@/modules/economic-events/application/economic-events.service';

export type FundamentalDecision = 'ALLOW' | 'BLOCK';

export type FundamentalEvaluationResult = {
  decision: FundamentalDecision;
  currency: string;
  windowBeforeMinutes: number;
  windowAfterMinutes: number;
  blockingEvent: Pick<EconomicEvent, 'id' | 'currency' | 'title' | 'impact' | 'eventTime'> | null;
  reason: string;
  createdAt: Date;
};

@Injectable()
export class FundamentalAgentService {
  readonly windowBeforeMinutes = 15;
  readonly windowAfterMinutes = 15;

  constructor(
    private readonly economicEvents: EconomicEventsService,
    private readonly eventBus: InternalEventBus,
  ) {}

  async evaluate(input: {
    currency: string;
    timestamp: Date;
    emitEvents?: boolean;
  }): Promise<FundamentalEvaluationResult> {
    const currency = this.normalizeCurrency(input.currency);
    const blockingEvent = await this.economicEvents.findBlockingEvent({
      currency,
      timestamp: input.timestamp,
      windowBeforeMinutes: this.windowBeforeMinutes,
      windowAfterMinutes: this.windowAfterMinutes,
    });
    const decision: FundamentalDecision = blockingEvent ? 'BLOCK' : 'ALLOW';
    const result: FundamentalEvaluationResult = {
      decision,
      currency,
      windowBeforeMinutes: this.windowBeforeMinutes,
      windowAfterMinutes: this.windowAfterMinutes,
      blockingEvent: blockingEvent
        ? {
            id: blockingEvent.id,
            currency: blockingEvent.currency,
            title: blockingEvent.title,
            impact: blockingEvent.impact,
            eventTime: blockingEvent.eventTime,
          }
        : null,
      reason: blockingEvent
        ? 'Evento económico de alto impacto dentro de la ventana de bloqueo.'
        : 'No hay eventos de alto impacto dentro de la ventana de bloqueo.',
      createdAt: input.timestamp,
    };

    if (input.emitEvents ?? true) {
      this.eventBus.emit(TRADING_EVENTS.FUNDAMENTAL_EVALUATED, {
        decision: result.decision,
        currency: result.currency,
        reason: result.reason,
        blockingEvent: result.blockingEvent,
        checkedAt: result.createdAt,
      });
      if (result.decision === 'BLOCK' && result.blockingEvent) {
        this.eventBus.emit(TRADING_EVENTS.FUNDAMENTAL_BLOCK, {
          economicEventId: result.blockingEvent.id,
          currency: result.currency,
          impact: result.blockingEvent.impact,
          title: result.blockingEvent.title,
        });
      }
    }

    return result;
  }

  async getStatus(currency = 'USD') {
    const checkedAt = new Date();
    const result = await this.evaluate({
      currency,
      timestamp: checkedAt,
      emitEvents: false,
    });

    return {
      isBlocked: result.decision === 'BLOCK',
      currency: result.currency,
      activeEvent: result.blockingEvent,
      windowBeforeMinutes: result.windowBeforeMinutes,
      windowAfterMinutes: result.windowAfterMinutes,
      reason: result.reason,
      checkedAt,
    };
  }

  private normalizeCurrency(currency: string) {
    return currency.trim().toUpperCase();
  }
}
