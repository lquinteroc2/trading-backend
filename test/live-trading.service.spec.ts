import { ForbiddenException } from '@nestjs/common';
import {
  LiveExecutionAction,
  LiveExecutionStatus,
  LiveTradeStatus,
  ManualTradingDecisionAction,
  Role,
  SignalDirection,
  SignalStatus,
  SupervisorDecisionAction,
  SystemMode,
} from '@prisma/client';
import { LiveTradingGuardService } from '@/modules/live-trading/application/live-trading-guard.service';
import { LiveTradingService } from '@/modules/live-trading/application/live-trading.service';

function decimal(value: number) {
  return { toNumber: () => value };
}

function makePrisma(
  overrides: {
    enableLiveTrading?: boolean;
    mt5DryRun?: boolean;
    killSwitch?: boolean;
    systemMode?: SystemMode;
    role?: Role;
    riskApproved?: boolean;
    supervisorOperate?: boolean;
    manualApproval?: boolean;
    existingSignalLiveTrade?: boolean;
    openSameSymbol?: boolean;
    dailyTrades?: number;
    signalStatus?: SignalStatus;
  } = {},
) {
  const signal = {
    id: 'signal-1',
    status: overrides.signalStatus ?? SignalStatus.MANUALLY_APPROVED,
    direction: SignalDirection.BUY,
    entryPrice: decimal(2320.35),
    stopLoss: decimal(2315),
    takeProfit: decimal(2330),
    instrument: { symbol: 'XAUUSD', brokerSymbol: null },
    supervisorDecision: {
      id: 'supervisor-decision-1',
      decision:
        overrides.supervisorOperate === false
          ? SupervisorDecisionAction.WAIT
          : SupervisorDecisionAction.OPERATE,
    },
  };
  const prisma: Record<string, any> = {
    user: {
      findUnique: jest.fn(async () => ({
        id: 'user-1',
        role: overrides.role ?? Role.ADMIN,
      })),
    },
    tradingSignal: {
      findUnique: jest.fn(async () => signal),
      update: jest.fn(async (input) => ({ ...signal, status: input.data.status })),
    },
    riskAssessment: {
      findFirst: jest.fn(async () =>
        overrides.riskApproved === false
          ? null
          : {
              id: 'risk-1',
              positionSize: decimal(0.01),
            },
      ),
    },
    manualTradingDecision: {
      findFirst: jest.fn(async () =>
        overrides.manualApproval === false
          ? null
          : {
              id: 'manual-decision-1',
              signalId: 'signal-1',
              userId: 'user-1',
              decision: ManualTradingDecisionAction.APPROVE,
            },
      ),
    },
    liveTradingLimits: {
      upsert: jest.fn(async () => ({
        id: 'global',
        maxDailyLiveTrades: 1,
        maxDailyLoss: decimal(50),
        maxVolumePerTrade: decimal(0.01),
        allowedSymbols: ['XAUUSD', 'BTCUSDT'],
        isActive: true,
      })),
    },
    liveTrade: {
      findFirst: jest
        .fn()
        .mockImplementationOnce(async () =>
          overrides.existingSignalLiveTrade ? { id: 'live-trade-existing' } : null,
        )
        .mockImplementationOnce(async () =>
          overrides.openSameSymbol ? { id: 'live-trade-symbol' } : null,
        ),
      count: jest.fn(async () => overrides.dailyTrades ?? 0),
      create: jest.fn(async (input) => ({ id: 'live-trade-1', ...input.data })),
      update: jest.fn(async (input) => ({ id: input.where.id, ...input.data })),
      findMany: jest.fn(async () => []),
      findUnique: jest.fn(async () => ({ id: 'live-trade-1' })),
    },
    liveExecutionLog: {
      create: jest.fn(async (input) => ({ id: 'log-1', ...input.data })),
      findMany: jest.fn(async () => []),
    },
  };
  prisma.$transaction = jest.fn(async (input: unknown) => {
    if (typeof input === 'function') {
      return input(prisma);
    }
    return Promise.all(input as Promise<unknown>[]);
  });
  const config = {
    get: jest.fn((key: string) => {
      if (key === 'broker.enableLiveTrading') return overrides.enableLiveTrading ?? true;
      if (key === 'mt5.dryRun') return overrides.mt5DryRun ?? false;
      return undefined;
    }),
  };
  const systemConfig = {
    getConfig: jest.fn(async () => ({
      mode: overrides.systemMode ?? SystemMode.LIVE_LIMITED,
      killSwitch: overrides.killSwitch ?? false,
    })),
  };
  return { prisma, config, systemConfig };
}

function makeGuard(overrides = {}) {
  const { prisma, config, systemConfig } = makePrisma(overrides);
  return {
    guard: new LiveTradingGuardService(prisma as never, config as never, systemConfig as never),
    prisma,
  };
}

describe('LiveTradingGuardService', () => {
  it('blocks when ENABLE_LIVE_TRADING=false', async () => {
    const { guard } = makeGuard({ enableLiveTrading: false });
    await expect(guard.validateLiveExecution('signal-1', 'user-1')).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('blocks when MT5_DRY_RUN=true', async () => {
    const { guard } = makeGuard({ mt5DryRun: true });
    await expect(guard.validateLiveExecution('signal-1', 'user-1')).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('blocks when killSwitch=true', async () => {
    const { guard } = makeGuard({ killSwitch: true });
    await expect(guard.validateLiveExecution('signal-1', 'user-1')).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('blocks when SystemMode is not LIVE_LIMITED', async () => {
    const { guard } = makeGuard({ systemMode: SystemMode.ASSISTED_TRADING });
    await expect(guard.validateLiveExecution('signal-1', 'user-1')).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('blocks when user is not ADMIN', async () => {
    const { guard } = makeGuard({ role: Role.TRADER });
    await expect(guard.validateLiveExecution('signal-1', 'user-1')).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('blocks when risk is not approved', async () => {
    const { guard } = makeGuard({ riskApproved: false });
    await expect(guard.validateLiveExecution('signal-1', 'user-1')).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('blocks when supervisor is not OPERATE', async () => {
    const { guard } = makeGuard({ supervisorOperate: false });
    await expect(guard.validateLiveExecution('signal-1', 'user-1')).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('blocks when manual approval is missing', async () => {
    const { guard } = makeGuard({ manualApproval: false });
    await expect(guard.validateLiveExecution('signal-1', 'user-1')).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('blocks when daily live trade limit is reached', async () => {
    const { guard } = makeGuard({ dailyTrades: 1 });
    await expect(guard.validateLiveExecution('signal-1', 'user-1')).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });
});

describe('LiveTradingService', () => {
  it('executes limited live trade when all conditions pass and writes audit logs', async () => {
    const { prisma, config, systemConfig } = makePrisma();
    const guard = new LiveTradingGuardService(
      prisma as never,
      config as never,
      systemConfig as never,
    );
    const brokerService = {
      placeLiveOrder: jest.fn(async () => ({
        executed: true,
        brokerOrderId: '123456',
        symbol: 'XAUUSD',
        direction: 'BUY',
        volume: 0.01,
        requestedPrice: 2320.35,
        executedPrice: 2320.4,
        spread: 0.05,
        timestamp: '2026-05-06T00:00:00.000Z',
      })),
    };
    const eventBus = { emit: jest.fn() };
    const service = new LiveTradingService(
      prisma as never,
      guard,
      brokerService as never,
      eventBus as never,
    );

    const result = await service.executeLiveFromSignal(
      'signal-1',
      'user-1',
      'manual-decision-1',
    );

    expect(result.liveTrade.status).toBe(LiveTradeStatus.EXECUTED);
    expect(brokerService.placeLiveOrder).toHaveBeenCalledWith(
      expect.objectContaining({ symbol: 'XAUUSD', comment: 'INVERSIONES_LIVE_LIMITED' }),
    );
    expect(prisma.liveTrade.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        signalId: 'signal-1',
        manualDecisionId: 'manual-decision-1',
        status: LiveTradeStatus.REQUESTED,
      }),
    });
    expect(prisma.liveTrade.update).toHaveBeenCalledWith({
      where: { id: 'live-trade-1' },
      data: expect.objectContaining({
        brokerOrderId: '123456',
        status: LiveTradeStatus.EXECUTED,
      }),
    });
    expect(prisma.liveExecutionLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: LiveExecutionAction.VALIDATION,
        status: LiveExecutionStatus.SUCCESS,
      }),
    });
    expect(prisma.liveExecutionLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: LiveExecutionAction.BROKER_RESPONSE,
        status: LiveExecutionStatus.SUCCESS,
      }),
    });
  });
});
