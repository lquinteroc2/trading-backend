import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import {
  ManualExecutionTarget,
  ManualTradingDecisionAction,
  Prisma,
  RiskAssessmentDecision,
  SignalStatus,
  SupervisorDecisionAction,
  SystemMode,
} from '@prisma/client';
import { PrismaService } from '@/database/prisma.service';
import { InternalEventBus } from '@/events/internal-event-bus.service';
import { TRADING_EVENTS } from '@/events/trading-events';
import { BrokerService } from '@/modules/broker/application/broker.service';
import { SystemConfigService } from '@/modules/system/application/system-config.service';
import { PaperTradingQueueProducer } from '@/queues/paper-trading-queue.producer';

type ManualAuditContext = {
  ipAddress?: string;
  userAgent?: string;
};

@Injectable()
export class AssistedTradingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly systemConfig: SystemConfigService,
    private readonly paperTradingQueueProducer: PaperTradingQueueProducer,
    private readonly brokerService: BrokerService,
    @Optional()
    private readonly eventBus?: InternalEventBus,
  ) {}

  async markSignalPendingManualApproval(
    signalId: string,
    supervisorDecisionId?: string,
    reason = 'Supervisor recommended OPERATE',
  ) {
    const signal = await this.prisma.tradingSignal.findUnique({
      where: { id: signalId },
      include: { supervisorDecision: true },
    });
    if (!signal) {
      throw new NotFoundException('Signal not found');
    }

    const resolvedSupervisorDecisionId =
      supervisorDecisionId ?? signal.supervisorDecision?.id;
    if (!resolvedSupervisorDecisionId) {
      throw new BadRequestException('Signal has no SupervisorDecision');
    }

    const updated = await this.prisma.tradingSignal.update({
      where: { id: signalId },
      data: { status: SignalStatus.PENDING_MANUAL_APPROVAL },
    });

    this.eventBus?.emit(TRADING_EVENTS.ASSISTED_APPROVAL_REQUIRED, {
      signalId,
      supervisorDecisionId: resolvedSupervisorDecisionId,
      reason,
    });

    return updated;
  }

  async approveSignal(
    signalId: string,
    userId: string,
    executionTarget: ManualExecutionTarget,
    reason: string,
    context: ManualAuditContext = {},
  ) {
    const { signal, supervisorDecision } = await this.validateApprovalPreconditions(signalId);
    await this.ensureNoManualDecision(signalId);

    const manualDecision = await this.prisma.manualTradingDecision.create({
      data: {
        signalId,
        supervisorDecisionId: supervisorDecision.id,
        userId,
        decision: ManualTradingDecisionAction.APPROVE,
        executionTarget,
        reason,
        metadata: {
          signalStatusBefore: signal.status,
          systemMode: SystemMode.ASSISTED_TRADING,
        } as Prisma.InputJsonValue,
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
      },
    });

    await this.prisma.tradingSignal.update({
      where: { id: signalId },
      data: { status: SignalStatus.MANUALLY_APPROVED },
    });

    this.eventBus?.emit(TRADING_EVENTS.ASSISTED_SIGNAL_APPROVED, {
      signalId,
      manualDecisionId: manualDecision.id,
      userId,
      executionTarget,
      reason,
    });

    await this.executeApprovedDecision(manualDecision.id);

    return manualDecision;
  }

  async rejectSignal(
    signalId: string,
    userId: string,
    reason: string,
    context: ManualAuditContext = {},
  ) {
    const signal = await this.prisma.tradingSignal.findUnique({
      where: { id: signalId },
      include: { supervisorDecision: true },
    });
    if (!signal) {
      throw new NotFoundException('Signal not found');
    }
    if (signal.status !== SignalStatus.PENDING_MANUAL_APPROVAL) {
      throw new BadRequestException('Signal is not pending manual approval');
    }
    if (!signal.supervisorDecision) {
      throw new BadRequestException('Signal has no SupervisorDecision');
    }
    await this.ensureNoManualDecision(signalId);

    const manualDecision = await this.prisma.manualTradingDecision.create({
      data: {
        signalId,
        supervisorDecisionId: signal.supervisorDecision.id,
        userId,
        decision: ManualTradingDecisionAction.REJECT,
        executionTarget: ManualExecutionTarget.NONE,
        reason,
        metadata: {
          signalStatusBefore: signal.status,
        } as Prisma.InputJsonValue,
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
      },
    });

    await this.prisma.tradingSignal.update({
      where: { id: signalId },
      data: { status: SignalStatus.MANUALLY_REJECTED },
    });

    this.eventBus?.emit(TRADING_EVENTS.ASSISTED_SIGNAL_REJECTED, {
      signalId,
      manualDecisionId: manualDecision.id,
      userId,
      executionTarget: ManualExecutionTarget.NONE,
      reason,
    });

    return manualDecision;
  }

  async executeApprovedDecision(manualDecisionId: string) {
    const manualDecision = await this.prisma.manualTradingDecision.findUnique({
      where: { id: manualDecisionId },
    });
    if (!manualDecision) {
      throw new NotFoundException('Manual trading decision not found');
    }
    if (manualDecision.decision !== ManualTradingDecisionAction.APPROVE) {
      throw new BadRequestException('Only approved manual decisions can be executed');
    }

    this.eventBus?.emit(TRADING_EVENTS.ASSISTED_EXECUTION_STARTED, {
      signalId: manualDecision.signalId,
      manualDecisionId,
      executionTarget: manualDecision.executionTarget,
      message: `Starting assisted execution for ${manualDecision.executionTarget}`,
    });

    try {
      if (manualDecision.executionTarget === ManualExecutionTarget.PAPER_TRADING) {
        await this.paperTradingQueueProducer.enqueueOpenTrade({
          signalId: manualDecision.signalId,
        });
        this.eventBus?.emit(TRADING_EVENTS.ASSISTED_EXECUTION_COMPLETED, {
          signalId: manualDecision.signalId,
          manualDecisionId,
          executionTarget: manualDecision.executionTarget,
          message: 'Paper trading job enqueued',
        });
        return { status: 'QUEUED', executionTarget: manualDecision.executionTarget };
      }

      if (manualDecision.executionTarget === ManualExecutionTarget.MT5_DRY_RUN) {
        const response = await this.brokerService.dryRunOrderFromSignal(manualDecision.signalId);
        await this.prisma.tradingSignal.update({
          where: { id: manualDecision.signalId },
          data: { status: SignalStatus.DRY_RUN_EXECUTED },
        });
        this.eventBus?.emit(TRADING_EVENTS.ASSISTED_EXECUTION_COMPLETED, {
          signalId: manualDecision.signalId,
          manualDecisionId,
          executionTarget: manualDecision.executionTarget,
          message: 'MT5 dry-run executed',
        });
        return response;
      }

      this.eventBus?.emit(TRADING_EVENTS.ASSISTED_EXECUTION_COMPLETED, {
        signalId: manualDecision.signalId,
        manualDecisionId,
        executionTarget: manualDecision.executionTarget,
        message: 'Manual approval saved without execution',
      });
      return { status: 'APPROVED_WITHOUT_EXECUTION', executionTarget: manualDecision.executionTarget };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.eventBus?.emit(TRADING_EVENTS.ASSISTED_EXECUTION_FAILED, {
        signalId: manualDecision.signalId,
        manualDecisionId,
        executionTarget: manualDecision.executionTarget,
        message,
      });
      throw error;
    }
  }

  findPendingSignals(query: {
    instrumentId?: string;
    timeframe?: string;
    from?: string;
    to?: string;
  }) {
    return this.prisma.tradingSignal.findMany({
      where: {
        status: SignalStatus.PENDING_MANUAL_APPROVAL,
        instrumentId: query.instrumentId,
        timeframe: query.timeframe as never,
        createdAt: {
          gte: query.from ? new Date(query.from) : undefined,
          lte: query.to ? new Date(query.to) : undefined,
        },
      },
      include: { instrument: true, supervisorDecision: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  findDecisions() {
    return this.prisma.manualTradingDecision.findMany({
      include: { signal: true, user: true, supervisorDecision: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findDecisionById(id: string) {
    const decision = await this.prisma.manualTradingDecision.findUnique({
      where: { id },
      include: { signal: true, user: true, supervisorDecision: true },
    });
    if (!decision) {
      throw new NotFoundException('Manual trading decision not found');
    }
    return decision;
  }

  private async validateApprovalPreconditions(signalId: string) {
    const signal = await this.prisma.tradingSignal.findUnique({
      where: { id: signalId },
      include: { supervisorDecision: true },
    });
    if (!signal) {
      throw new NotFoundException('Signal not found');
    }
    if (signal.status !== SignalStatus.PENDING_MANUAL_APPROVAL) {
      throw new BadRequestException('Signal is not pending manual approval');
    }

    const systemConfig = await this.systemConfig.getConfig();
    if (systemConfig.killSwitch) {
      throw new ForbiddenException('Kill switch is enabled');
    }
    if (systemConfig.mode !== SystemMode.ASSISTED_TRADING) {
      throw new ForbiddenException('System mode must be ASSISTED_TRADING');
    }

    const riskDecision = await this.prisma.riskAssessment.findFirst({
      where: { signalId, decision: RiskAssessmentDecision.APPROVED },
      orderBy: { createdAt: 'desc' },
    });
    if (!riskDecision) {
      throw new BadRequestException('Signal has no approved RiskDecision');
    }

    const supervisorDecision = signal.supervisorDecision;
    if (supervisorDecision?.decision !== SupervisorDecisionAction.OPERATE) {
      throw new BadRequestException('Signal has no SupervisorDecision OPERATE');
    }

    return { signal, supervisorDecision, riskDecision };
  }

  private async ensureNoManualDecision(signalId: string) {
    const existing = await this.prisma.manualTradingDecision.findFirst({
      where: { signalId },
      orderBy: { createdAt: 'desc' },
    });
    if (existing) {
      throw new BadRequestException('Manual trading decision already exists for this signal');
    }
  }
}
