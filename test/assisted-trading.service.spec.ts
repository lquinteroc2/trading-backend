import { BadRequestException, ForbiddenException } from '@nestjs/common';
import {
  ManualExecutionTarget,
  ManualTradingDecisionAction,
  RiskAssessmentDecision,
  SignalDirection,
  SignalStatus,
  SupervisorDecisionAction,
  SystemMode,
} from '@prisma/client';
import { AssistedTradingService } from '@/modules/assisted-trading/application/assisted-trading.service';

function decimal(value: number) {
  return { toNumber: () => value };
}

function makeService(
  overrides: {
    signalStatus?: SignalStatus;
    riskApproved?: boolean;
    supervisorDecision?: SupervisorDecisionAction;
    killSwitch?: boolean;
    systemMode?: SystemMode;
    existingManualDecision?: boolean;
  } = {},
) {
  const signal = {
    id: 'signal-1',
    instrumentId: 'instrument-1',
    direction: SignalDirection.BUY,
    status: overrides.signalStatus ?? SignalStatus.PENDING_MANUAL_APPROVAL,
    entryPrice: decimal(100),
    stopLoss: decimal(95),
    takeProfit: decimal(112),
    instrument: { symbol: 'XAUUSD', brokerSymbol: null },
    supervisorDecision: {
      id: 'supervisor-decision-1',
      decision: overrides.supervisorDecision ?? SupervisorDecisionAction.OPERATE,
    },
  };
  let lastManualDecision: Record<string, unknown> | null = null;
  const prisma = {
    tradingSignal: {
      findUnique: jest.fn(async () => signal),
      update: jest.fn(async (input) => ({ ...signal, status: input.data.status })),
      findMany: jest.fn(async () => [signal]),
    },
    riskAssessment: {
      findFirst: jest.fn(async () =>
        overrides.riskApproved === false
          ? null
          : {
              id: 'risk-1',
              decision: RiskAssessmentDecision.APPROVED,
              positionSize: decimal(0.01),
            },
      ),
    },
    manualTradingDecision: {
      findFirst: jest.fn(async () =>
        overrides.existingManualDecision
          ? { id: 'manual-decision-existing', signalId: signal.id }
          : null,
      ),
      create: jest.fn(async (input) => {
        lastManualDecision = { id: 'manual-decision-1', ...input.data };
        return lastManualDecision;
      }),
      findUnique: jest.fn(async () => lastManualDecision),
      findMany: jest.fn(async () => []),
    },
  };
  const systemConfig = {
    getConfig: jest.fn(async () => ({
      mode: overrides.systemMode ?? SystemMode.ASSISTED_TRADING,
      killSwitch: overrides.killSwitch ?? false,
    })),
  };
  const paperTradingQueueProducer = {
    enqueueOpenTrade: jest.fn(async () => ({ id: 'job-1' })),
  };
  const brokerService = {
    dryRunOrderFromSignal: jest.fn(async () => ({ dryRun: true, wouldExecute: true })),
  };
  const eventBus = {
    emit: jest.fn(),
  };

  const service = new AssistedTradingService(
    prisma as never,
    systemConfig as never,
    paperTradingQueueProducer as never,
    brokerService as never,
    eventBus as never,
  );

  return { service, prisma, systemConfig, paperTradingQueueProducer, brokerService, eventBus };
}

describe('AssistedTradingService', () => {
  it('approve fails without approved risk decision', async () => {
    const { service } = makeService({ riskApproved: false });

    await expect(
      service.approveSignal(
        'signal-1',
        'user-1',
        ManualExecutionTarget.NONE,
        'Manual validation',
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('approve fails without supervisor OPERATE', async () => {
    const { service } = makeService({ supervisorDecision: SupervisorDecisionAction.WAIT });

    await expect(
      service.approveSignal(
        'signal-1',
        'user-1',
        ManualExecutionTarget.NONE,
        'Manual validation',
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('approve fails with kill switch enabled', async () => {
    const { service } = makeService({ killSwitch: true });

    await expect(
      service.approveSignal(
        'signal-1',
        'user-1',
        ManualExecutionTarget.NONE,
        'Manual validation',
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('approve PAPER_TRADING enqueues paper trade', async () => {
    const { service, paperTradingQueueProducer, prisma } = makeService();

    await service.approveSignal(
      'signal-1',
      'user-1',
      ManualExecutionTarget.PAPER_TRADING,
      'Setup validado',
    );

    expect(prisma.manualTradingDecision.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        decision: ManualTradingDecisionAction.APPROVE,
        executionTarget: ManualExecutionTarget.PAPER_TRADING,
      }),
    });
    expect(paperTradingQueueProducer.enqueueOpenTrade).toHaveBeenCalledWith({
      signalId: 'signal-1',
    });
  });

  it('approve MT5_DRY_RUN executes broker dry-run', async () => {
    const { service, brokerService, prisma } = makeService();

    await service.approveSignal(
      'signal-1',
      'user-1',
      ManualExecutionTarget.MT5_DRY_RUN,
      'Setup validado',
    );

    expect(brokerService.dryRunOrderFromSignal).toHaveBeenCalledWith('signal-1');
    expect(prisma.tradingSignal.update).toHaveBeenCalledWith({
      where: { id: 'signal-1' },
      data: { status: SignalStatus.DRY_RUN_EXECUTED },
    });
  });

  it('reject saves manual decision', async () => {
    const { service, prisma } = makeService();

    await service.rejectSignal('signal-1', 'user-1', 'Contexto invalido');

    expect(prisma.manualTradingDecision.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        decision: ManualTradingDecisionAction.REJECT,
        executionTarget: ManualExecutionTarget.NONE,
        reason: 'Contexto invalido',
      }),
    });
    expect(prisma.tradingSignal.update).toHaveBeenCalledWith({
      where: { id: 'signal-1' },
      data: { status: SignalStatus.MANUALLY_REJECTED },
    });
  });

  it('does not allow duplicate manual decisions', async () => {
    const { service } = makeService({ existingManualDecision: true });

    await expect(
      service.approveSignal(
        'signal-1',
        'user-1',
        ManualExecutionTarget.NONE,
        'Manual validation',
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
