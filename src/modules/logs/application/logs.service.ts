import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { SignalStatus, SystemLogLevel } from '@prisma/client';
import { PrismaService } from '@/database/prisma.service';
import { InternalEventBus } from '@/events/internal-event-bus.service';
import {
  JobFailedEvent,
  KillSwitchChangedEvent,
  EconomicEventChangedEvent,
  FundamentalEvaluatedEvent,
  FundamentalBlockEvent,
  SupervisorBlockedByFundamentalEvent,
  PaperTradeClosedEvent,
  PaperTradeOpenedEvent,
  RiskEvaluatedEvent,
  SignalCreatedEvent,
  SignalStatusUpdatedEvent,
  SupervisorDecidedEvent,
  TRADING_EVENTS,
} from '@/events/trading-events';

@Injectable()
export class LogsService implements OnModuleInit {
  private readonly logger = new Logger(LogsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventBus: InternalEventBus,
  ) {}

  onModuleInit() {
    this.eventBus.on<SignalCreatedEvent>(TRADING_EVENTS.SIGNAL_CREATED, (event) =>
      this.create({
        level: SystemLogLevel.INFO,
        source: 'signals',
        message: 'Signal generated',
        context: `signalId=${event.signalId} instrumentId=${event.instrumentId} timeframe=${event.timeframe ?? ''}`,
      }),
    );
    this.eventBus.on<SignalStatusUpdatedEvent>(TRADING_EVENTS.SIGNAL_STATUS_UPDATED, (event) => {
      if (event.status !== SignalStatus.APPROVED && event.status !== SignalStatus.REJECTED) {
        return;
      }
      return this.create({
        level: event.status === SignalStatus.APPROVED ? SystemLogLevel.INFO : SystemLogLevel.WARN,
        source: 'signals',
        message: event.status === SignalStatus.APPROVED ? 'Signal approved' : 'Signal rejected',
        context: `signalId=${event.signalId} status=${event.status}`,
      });
    });
    this.eventBus.on<RiskEvaluatedEvent>(TRADING_EVENTS.RISK_EVALUATED, (event) =>
      this.create({
        level: event.decision === 'APPROVED' ? SystemLogLevel.INFO : SystemLogLevel.WARN,
        source: 'risk-agent',
        message: 'Risk decision',
        context: `signalId=${event.signalId} assessmentId=${event.assessmentId} decision=${event.decision}`,
      }),
    );
    this.eventBus.on<SupervisorDecidedEvent>(TRADING_EVENTS.SUPERVISOR_DECIDED, (event) =>
      this.create({
        level: event.decision === 'OPERATE' ? SystemLogLevel.INFO : SystemLogLevel.WARN,
        source: 'supervisor',
        message: 'Supervisor decision',
        context: `signalId=${event.signalId} supervisorDecisionId=${event.supervisorDecisionId} agentDecisionId=${event.agentDecisionId} decision=${event.decision}`,
      }),
    );
    this.eventBus.on<PaperTradeOpenedEvent>(TRADING_EVENTS.PAPER_TRADE_OPENED, (event) =>
      this.create({
        level: SystemLogLevel.INFO,
        source: 'paper-trading',
        message: 'Trade opened',
        context: `signalId=${event.signalId} tradeId=${event.tradeId} instrumentId=${event.instrumentId}`,
      }),
    );
    this.eventBus.on<PaperTradeClosedEvent>(TRADING_EVENTS.PAPER_TRADE_CLOSED, (event) =>
      this.create({
        level: SystemLogLevel.INFO,
        source: 'paper-trading',
        message: 'Trade closed',
        context: `tradeId=${event.tradeId} result=${event.result} pnl=${event.pnl}`,
      }),
    );
    this.eventBus.on<JobFailedEvent>(TRADING_EVENTS.JOB_FAILED, (event) =>
      this.create({
        level: SystemLogLevel.ERROR,
        source: event.source,
        message: 'Job failed',
        context: `jobId=${event.jobId ?? ''} error=${event.message}`,
      }),
    );
    this.eventBus.on<KillSwitchChangedEvent>(TRADING_EVENTS.KILL_SWITCH_CHANGED, (event) =>
      this.create({
        level: event.killSwitch ? SystemLogLevel.WARN : SystemLogLevel.INFO,
        source: 'system',
        message: event.killSwitch ? 'Kill switch activated' : 'Kill switch deactivated',
        context: `killSwitch=${event.killSwitch}`,
      }),
    );
    this.eventBus.on<EconomicEventChangedEvent>(TRADING_EVENTS.ECONOMIC_EVENT_CREATED, (event) =>
      this.create({
        level: SystemLogLevel.INFO,
        source: 'economic-events',
        message: 'Economic event created',
        context: `economicEventId=${event.id} currency=${event.currency} impact=${event.impact}`,
      }),
    );
    this.eventBus.on<EconomicEventChangedEvent>(TRADING_EVENTS.ECONOMIC_EVENT_UPDATED, (event) =>
      this.create({
        level: SystemLogLevel.INFO,
        source: 'economic-events',
        message: 'Economic event updated',
        context: `economicEventId=${event.id} currency=${event.currency} impact=${event.impact}`,
      }),
    );
    this.eventBus.on<EconomicEventChangedEvent>(TRADING_EVENTS.ECONOMIC_EVENT_DELETED, (event) =>
      this.create({
        level: SystemLogLevel.WARN,
        source: 'economic-events',
        message: 'Economic event deleted',
        context: `economicEventId=${event.id} currency=${event.currency} impact=${event.impact}`,
      }),
    );
    this.eventBus.on<FundamentalEvaluatedEvent>(TRADING_EVENTS.FUNDAMENTAL_EVALUATED, (event) =>
      this.create({
        level: event.decision === 'BLOCK' ? SystemLogLevel.WARN : SystemLogLevel.INFO,
        source: 'fundamental-agent',
        message: `Fundamental evaluation ${event.decision.toLowerCase()}`,
        context: `currency=${event.currency} decision=${event.decision} economicEventId=${event.blockingEvent?.id ?? ''}`,
      }),
    );
    this.eventBus.on<FundamentalBlockEvent>(TRADING_EVENTS.FUNDAMENTAL_BLOCK, (event) =>
      this.create({
        level: SystemLogLevel.WARN,
        source: 'fundamental-agent',
        message: 'Fundamental block',
        context: `economicEventId=${event.economicEventId} currency=${event.currency} impact=${event.impact}`,
      }),
    );
    this.eventBus.on<SupervisorBlockedByFundamentalEvent>(
      TRADING_EVENTS.SUPERVISOR_BLOCKED_BY_FUNDAMENTAL,
      (event) =>
        this.create({
          level: SystemLogLevel.WARN,
          source: 'supervisor',
          message: 'Supervisor blocked by fundamental event',
          context: `signalId=${event.signalId} supervisorDecisionId=${event.supervisorDecisionId} economicEventId=${event.economicEventId ?? ''}`,
        }),
    );
  }

  async findMany() {
    return this.prisma.systemLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }

  async create(data: {
    level: SystemLogLevel;
    source: string;
    message: string;
    context?: string;
  }): Promise<void> {
    try {
      const log = await this.prisma.systemLog.create({ data });
      this.eventBus.emit(TRADING_EVENTS.SYSTEM_LOG_CREATED, {
        id: log.id,
        level: log.level,
        source: log.source,
        message: log.message,
        context: log.context,
        createdAt: log.createdAt,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to persist system log: ${message}`);
    }
  }
}
