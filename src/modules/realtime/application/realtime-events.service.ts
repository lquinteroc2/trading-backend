import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Observable } from 'rxjs';
import { MessageEvent } from '@nestjs/common';
import { InternalEventBus } from '@/events/internal-event-bus.service';
import {
  JobCompletedEvent,
  JobFailedEvent,
  KillSwitchChangedEvent,
  EconomicEventChangedEvent,
  FundamentalEvaluatedEvent,
  FundamentalBlockEvent,
  PaperTradeClosedEvent,
  PaperTradeOpenedEvent,
  SignalCreatedEvent,
  SignalStatusUpdatedEvent,
  SupervisorDecidedEvent,
  SystemLogCreatedEvent,
  TRADING_EVENTS,
  AssistedApprovalRequiredEvent,
  AssistedExecutionEvent,
  AssistedSignalDecisionEvent,
} from '@/events/trading-events';

type RealtimeEventType =
  | 'SIGNAL_CREATED'
  | 'SIGNAL_UPDATED'
  | 'SUPERVISOR_DECISION'
  | 'TRADE_OPENED'
  | 'TRADE_CLOSED'
  | 'JOB_COMPLETED'
  | 'JOB_FAILED'
  | 'KILL_SWITCH_UPDATED'
  | 'SYSTEM_LOG'
  | 'ECONOMIC_EVENT_CREATED'
  | 'ECONOMIC_EVENT_UPDATED'
  | 'ECONOMIC_EVENT_DELETED'
  | 'FUNDAMENTAL_EVALUATED'
  | 'FUNDAMENTAL_BLOCK'
  | 'ASSISTED_APPROVAL_REQUIRED'
  | 'ASSISTED_SIGNAL_APPROVED'
  | 'ASSISTED_SIGNAL_REJECTED'
  | 'ASSISTED_EXECUTION_STARTED'
  | 'ASSISTED_EXECUTION_COMPLETED'
  | 'ASSISTED_EXECUTION_FAILED'
  | 'HEARTBEAT';

type RealtimeEvent = {
  id: string;
  type: RealtimeEventType;
  title: string;
  message: string;
  payload?: Record<string, unknown>;
  createdAt: string;
};

@Injectable()
export class RealtimeEventsService {
  private readonly heartbeatMs = 25_000;

  constructor(private readonly eventBus: InternalEventBus) {}

  stream(): Observable<MessageEvent> {
    return new Observable<MessageEvent>((subscriber) => {
      const send = (event: RealtimeEvent) => {
        subscriber.next({
          id: event.id,
          type: event.type,
          data: event,
        });
      };

      const unsubscribe = [
        this.eventBus.on<SignalCreatedEvent>(TRADING_EVENTS.SIGNAL_CREATED, (event) =>
          send(
            this.buildEvent('SIGNAL_CREATED', 'Nueva señal', 'Se generó una nueva señal', {
              signalId: event.signalId,
              instrumentId: event.instrumentId,
              timeframe: event.timeframe,
            }),
          ),
        ),
        this.eventBus.on<SignalStatusUpdatedEvent>(TRADING_EVENTS.SIGNAL_STATUS_UPDATED, (event) =>
          send(
            this.buildEvent('SIGNAL_UPDATED', 'Señal actualizada', `La señal cambió a ${event.status}`, {
              signalId: event.signalId,
              status: event.status,
            }),
          ),
        ),
        this.eventBus.on<SupervisorDecidedEvent>(TRADING_EVENTS.SUPERVISOR_DECIDED, (event) =>
          send(
            this.buildEvent(
              'SUPERVISOR_DECISION',
              'Decisión del supervisor',
              `El supervisor decidió ${event.decision}`,
              {
                signalId: event.signalId,
                agentDecisionId: event.agentDecisionId,
                supervisorDecisionId: event.supervisorDecisionId,
                decision: event.decision,
                reason: event.reason,
              },
            ),
          ),
        ),
        this.eventBus.on<PaperTradeOpenedEvent>(TRADING_EVENTS.PAPER_TRADE_OPENED, (event) =>
          send(
            this.buildEvent('TRADE_OPENED', 'Trade abierto', 'Se abrió un paper trade', {
              signalId: event.signalId,
              tradeId: event.tradeId,
              instrumentId: event.instrumentId,
            }),
          ),
        ),
        this.eventBus.on<PaperTradeClosedEvent>(TRADING_EVENTS.PAPER_TRADE_CLOSED, (event) =>
          send(
            this.buildEvent('TRADE_CLOSED', 'Trade cerrado', `Se cerró un paper trade con ${event.result}`, {
              tradeId: event.tradeId,
              result: event.result,
              pnl: event.pnl,
            }),
          ),
        ),
        this.eventBus.on<JobCompletedEvent>(TRADING_EVENTS.JOB_COMPLETED, (event) =>
          send(
            this.buildEvent('JOB_COMPLETED', 'Job completado', event.message, {
              source: event.source,
              jobId: event.jobId,
              ...(event.payload ?? {}),
            }),
          ),
        ),
        this.eventBus.on<JobFailedEvent>(TRADING_EVENTS.JOB_FAILED, (event) =>
          send(
            this.buildEvent('JOB_FAILED', 'Job fallido', event.message, {
              source: event.source,
              jobId: event.jobId,
            }),
          ),
        ),
        this.eventBus.on<KillSwitchChangedEvent>(TRADING_EVENTS.KILL_SWITCH_CHANGED, (event) =>
          send(
            this.buildEvent(
              'KILL_SWITCH_UPDATED',
              'Sistema actualizado',
              event.killSwitch ? 'Kill switch activado' : 'Kill switch desactivado',
              {
                killSwitch: event.killSwitch,
                mode: event.mode,
              },
            ),
          ),
        ),
        this.eventBus.on<SystemLogCreatedEvent>(TRADING_EVENTS.SYSTEM_LOG_CREATED, (event) =>
          send(
            this.buildEvent('SYSTEM_LOG', event.message, event.context ?? event.message, {
              logId: event.id,
              level: event.level,
              source: event.source,
              context: event.context,
            }),
          ),
        ),
        this.eventBus.on<EconomicEventChangedEvent>(TRADING_EVENTS.ECONOMIC_EVENT_CREATED, (event) =>
          send(
            this.buildEvent('ECONOMIC_EVENT_CREATED', 'Evento económico creado', event.title, {
              economicEventId: event.id,
              currency: event.currency,
              impact: event.impact,
              eventTime: event.eventTime,
            }),
          ),
        ),
        this.eventBus.on<EconomicEventChangedEvent>(TRADING_EVENTS.ECONOMIC_EVENT_UPDATED, (event) =>
          send(
            this.buildEvent('ECONOMIC_EVENT_UPDATED', 'Evento económico actualizado', event.title, {
              economicEventId: event.id,
              currency: event.currency,
              impact: event.impact,
              eventTime: event.eventTime,
            }),
          ),
        ),
        this.eventBus.on<EconomicEventChangedEvent>(TRADING_EVENTS.ECONOMIC_EVENT_DELETED, (event) =>
          send(
            this.buildEvent('ECONOMIC_EVENT_DELETED', 'Evento económico eliminado', event.title, {
              economicEventId: event.id,
              currency: event.currency,
              impact: event.impact,
              eventTime: event.eventTime,
            }),
          ),
        ),
        this.eventBus.on<FundamentalEvaluatedEvent>(TRADING_EVENTS.FUNDAMENTAL_EVALUATED, (event) =>
          send(
            this.buildEvent(
              'FUNDAMENTAL_EVALUATED',
              'Evaluación fundamental',
              event.reason,
              {
                currency: event.currency,
                decision: event.decision,
                economicEventId: event.blockingEvent?.id ?? null,
              },
            ),
          ),
        ),
        this.eventBus.on<FundamentalBlockEvent>(TRADING_EVENTS.FUNDAMENTAL_BLOCK, (event) =>
          send(
            this.buildEvent(
              'FUNDAMENTAL_BLOCK',
              'Bloqueo fundamental',
              `Operación bloqueada por ${event.title}`,
              {
                economicEventId: event.economicEventId,
                currency: event.currency,
                impact: event.impact,
              },
            ),
          ),
        ),
        this.eventBus.on<AssistedApprovalRequiredEvent>(
          TRADING_EVENTS.ASSISTED_APPROVAL_REQUIRED,
          (event) =>
            send(
              this.buildEvent(
                'ASSISTED_APPROVAL_REQUIRED',
                'Aprobación manual requerida',
                'Una señal quedó pendiente de aprobación manual',
                {
                  signalId: event.signalId,
                  supervisorDecisionId: event.supervisorDecisionId,
                  reason: event.reason,
                },
              ),
            ),
        ),
        this.eventBus.on<AssistedSignalDecisionEvent>(
          TRADING_EVENTS.ASSISTED_SIGNAL_APPROVED,
          (event) =>
            send(
              this.buildEvent('ASSISTED_SIGNAL_APPROVED', 'Señal aprobada', event.reason, {
                signalId: event.signalId,
                manualDecisionId: event.manualDecisionId,
                userId: event.userId,
                executionTarget: event.executionTarget,
              }),
            ),
        ),
        this.eventBus.on<AssistedSignalDecisionEvent>(
          TRADING_EVENTS.ASSISTED_SIGNAL_REJECTED,
          (event) =>
            send(
              this.buildEvent('ASSISTED_SIGNAL_REJECTED', 'Señal rechazada', event.reason, {
                signalId: event.signalId,
                manualDecisionId: event.manualDecisionId,
                userId: event.userId,
                executionTarget: event.executionTarget,
              }),
            ),
        ),
        this.eventBus.on<AssistedExecutionEvent>(
          TRADING_EVENTS.ASSISTED_EXECUTION_STARTED,
          (event) =>
            send(
              this.buildEvent('ASSISTED_EXECUTION_STARTED', 'Ejecución asistida iniciada', event.message, {
                signalId: event.signalId,
                manualDecisionId: event.manualDecisionId,
                executionTarget: event.executionTarget,
              }),
            ),
        ),
        this.eventBus.on<AssistedExecutionEvent>(
          TRADING_EVENTS.ASSISTED_EXECUTION_COMPLETED,
          (event) =>
            send(
              this.buildEvent('ASSISTED_EXECUTION_COMPLETED', 'Ejecución asistida completada', event.message, {
                signalId: event.signalId,
                manualDecisionId: event.manualDecisionId,
                executionTarget: event.executionTarget,
              }),
            ),
        ),
        this.eventBus.on<AssistedExecutionEvent>(
          TRADING_EVENTS.ASSISTED_EXECUTION_FAILED,
          (event) =>
            send(
              this.buildEvent('ASSISTED_EXECUTION_FAILED', 'Ejecución asistida falló', event.message, {
                signalId: event.signalId,
                manualDecisionId: event.manualDecisionId,
                executionTarget: event.executionTarget,
              }),
            ),
        ),
      ];

      send(this.buildEvent('HEARTBEAT', 'Heartbeat', 'Conexión realtime activa'));
      const heartbeat = setInterval(() => {
        send(this.buildEvent('HEARTBEAT', 'Heartbeat', 'Conexión realtime activa'));
      }, this.heartbeatMs);

      return () => {
        clearInterval(heartbeat);
        unsubscribe.forEach((callback) => callback());
      };
    });
  }

  private buildEvent(
    type: RealtimeEventType,
    title: string,
    message: string,
    payload?: Record<string, unknown>,
  ): RealtimeEvent {
    return {
      id: `evt-${randomUUID()}`,
      type,
      title,
      message,
      payload,
      createdAt: new Date().toISOString(),
    };
  }
}
