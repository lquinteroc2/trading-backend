import { Injectable, NotFoundException } from '@nestjs/common';
import { EconomicImpact, Prisma } from '@prisma/client';
import { PrismaService } from '@/database/prisma.service';
import { InternalEventBus } from '@/events/internal-event-bus.service';
import { TRADING_EVENTS } from '@/events/trading-events';
import { CreateEconomicEventDto } from '../presentation/dto/create-economic-event.dto';
import { FindEconomicEventsDto } from '../presentation/dto/find-economic-events.dto';
import { UpdateEconomicEventDto } from '../presentation/dto/update-economic-event.dto';

@Injectable()
export class EconomicEventsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventBus: InternalEventBus,
  ) {}

  findMany(query: FindEconomicEventsDto = {}) {
    return this.prisma.economicEvent.findMany({
      where: this.buildWhere(query),
      orderBy: { eventTime: 'asc' },
    });
  }

  async create(dto: CreateEconomicEventDto) {
    const event = await this.prisma.economicEvent.create({
      data: {
        currency: this.normalizeCurrency(dto.currency),
        title: dto.title,
        impact: dto.impact,
        eventTime: new Date(dto.eventTime),
        source: dto.source,
        notes: dto.notes,
      },
    });
    this.eventBus.emit(TRADING_EVENTS.ECONOMIC_EVENT_CREATED, this.toEventPayload(event));
    return event;
  }

  async update(id: string, dto: UpdateEconomicEventDto) {
    await this.ensureExists(id);
    const event = await this.prisma.economicEvent.update({
      where: { id },
      data: {
        currency: dto.currency === undefined ? undefined : this.normalizeCurrency(dto.currency),
        title: dto.title,
        impact: dto.impact,
        eventTime: dto.eventTime === undefined ? undefined : new Date(dto.eventTime),
        source: dto.source,
        notes: dto.notes,
      },
    });
    this.eventBus.emit(TRADING_EVENTS.ECONOMIC_EVENT_UPDATED, this.toEventPayload(event));
    return event;
  }

  async delete(id: string) {
    await this.ensureExists(id);
    const event = await this.prisma.economicEvent.delete({ where: { id } });
    this.eventBus.emit(TRADING_EVENTS.ECONOMIC_EVENT_DELETED, this.toEventPayload(event));
    return { id: event.id, deleted: true };
  }

  async findBlockingEvent(input: {
    currency: string;
    timestamp: Date;
    windowBeforeMinutes: number;
    windowAfterMinutes: number;
  }) {
    const from = new Date(input.timestamp.getTime() - input.windowBeforeMinutes * 60_000);
    const to = new Date(input.timestamp.getTime() + input.windowAfterMinutes * 60_000);
    return this.prisma.economicEvent.findFirst({
      where: {
        currency: this.normalizeCurrency(input.currency),
        impact: EconomicImpact.HIGH,
        eventTime: {
          gte: from,
          lte: to,
        },
      },
      orderBy: { eventTime: 'asc' },
    });
  }

  private async ensureExists(id: string) {
    const event = await this.prisma.economicEvent.findUnique({ where: { id } });
    if (!event) {
      throw new NotFoundException('Economic event not found');
    }
    return event;
  }

  private buildWhere(query: FindEconomicEventsDto): Prisma.EconomicEventWhereInput {
    return {
      currency: query.currency ? this.normalizeCurrency(query.currency) : undefined,
      impact: query.impact,
      eventTime:
        query.from || query.to
          ? {
              gte: query.from ? this.parseDateFilter(query.from, 'from') : undefined,
              lte: query.to ? this.parseDateFilter(query.to, 'to') : undefined,
            }
          : undefined,
    };
  }

  private parseDateFilter(value: string, boundary: 'from' | 'to') {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return new Date(value);
    }

    return new Date(`${value}T${boundary === 'from' ? '00:00:00.000Z' : '23:59:59.999Z'}`);
  }

  private toEventPayload(event: {
    id: string;
    currency: string;
    title: string;
    impact: EconomicImpact;
    eventTime: Date;
  }) {
    return {
      id: event.id,
      currency: event.currency,
      title: event.title,
      impact: event.impact,
      eventTime: event.eventTime,
    };
  }

  private normalizeCurrency(currency: string) {
    return currency.trim().toUpperCase();
  }
}
