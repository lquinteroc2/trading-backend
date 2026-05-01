import {
  RiskAssessmentDecision,
  SignalDirection,
  SignalStatus,
  SourceAgent,
  SupervisorDecisionAction,
  SystemMode,
} from '@prisma/client';
import { SupervisorAgentService } from '@/modules/supervisor/application/supervisor-agent.service';
import { TradingSignalEntity } from '@/modules/signals/domain/trading-signal.entity';

const signal = new TradingSignalEntity(
  'signal-1',
  'instrument-1',
  'strategy-1',
  null,
  SignalDirection.BUY,
  100,
  95,
  112,
  80,
  SignalStatus.APPROVED,
  SourceAgent.TECHNICAL,
  null,
  'EMA trend',
  'EMA trend',
  new Date('2026-05-01T00:00:00.000Z'),
  null,
);

const riskDecision = {
  id: 'risk-assessment-1',
  decision: RiskAssessmentDecision.APPROVED,
  positionSize: 20,
  riskRewardRatio: 2.4,
};

const accountState = {
  balance: 10000,
  equity: 10000,
  openTrades: 0,
  dailyPnL: 0,
  hasOpenTradeForInstrument: false,
};

const systemConfig = {
  mode: SystemMode.PAPER_TRADING,
  killSwitch: false,
};

function makeService() {
  const prisma = {
    supervisorDecision: {
      findUnique: jest.fn(async () => null),
      create: jest.fn(async (data) => ({
        id: 'supervisor-decision-1',
        createdAt: new Date('2026-05-01T00:00:00.000Z'),
        ...data.data,
      })),
    },
    agentDecision: {
      create: jest.fn(async () => ({ id: 'agent-decision-1' })),
    },
    riskAssessment: {
      findFirst: jest.fn(async () => ({
        id: riskDecision.id,
        decision: riskDecision.decision,
        positionSize: { toNumber: () => riskDecision.positionSize },
        riskRewardRatio: { toNumber: () => riskDecision.riskRewardRatio },
      })),
    },
    paperTradingAccount: {
      findFirst: jest.fn(async () => ({
        balance: { toNumber: () => accountState.balance },
        equity: { toNumber: () => accountState.equity },
      })),
    },
    paperTrade: {
      findMany: jest.fn(async () => []),
    },
  };
  const signalsService = {
    findById: jest.fn(async () => signal),
    updateStatus: jest.fn(async () => ({ ...signal, status: SignalStatus.APPROVED })),
  };
  const systemConfigService = {
    getConfig: jest.fn(async () => systemConfig),
  };
  const config = {
    get: jest.fn((key: string, fallback?: unknown) => fallback),
  };

  const service = new SupervisorAgentService(
    prisma as never,
    signalsService as never,
    systemConfigService as never,
    config as never,
  );
  return { service, prisma, signalsService, systemConfigService };
}

describe('SupervisorAgentService', () => {
  it('approves operation when all conditions are satisfied', () => {
    const { service } = makeService();

    const result = service.decide(signal, riskDecision, accountState, systemConfig);

    expect(result.decision).toBe(SupervisorDecisionAction.OPERATE);
    expect(result.confidenceScore).toBe(80);
  });

  it('blocks when risk is rejected', () => {
    const { service } = makeService();

    const result = service.decide(
      signal,
      { ...riskDecision, decision: RiskAssessmentDecision.REJECTED },
      accountState,
      systemConfig,
    );

    expect(result.decision).toBe(SupervisorDecisionAction.BLOCK);
    expect(result.reason).toContain('Risk decision is REJECTED');
  });

  it('blocks when there is already an open trade for the instrument', () => {
    const { service } = makeService();

    const result = service.decide(
      signal,
      riskDecision,
      { ...accountState, openTrades: 1, hasOpenTradeForInstrument: true },
      systemConfig,
    );

    expect(result.decision).toBe(SupervisorDecisionAction.BLOCK);
    expect(result.reason).toContain('Instrument already has an open paper trade');
  });

  it('blocks when kill switch is active', () => {
    const { service } = makeService();

    const result = service.decide(signal, riskDecision, accountState, {
      ...systemConfig,
      killSwitch: true,
    });

    expect(result.decision).toBe(SupervisorDecisionAction.BLOCK);
    expect(result.reason).toContain('Kill switch is active');
  });

  it('waits when signal confidence is medium', () => {
    const { service } = makeService();

    const result = service.decide(
      { ...signal, confidenceScore: 60 },
      riskDecision,
      accountState,
      systemConfig,
    );

    expect(result.decision).toBe(SupervisorDecisionAction.WAIT);
  });

  it('persists supervisor and agent decisions', async () => {
    const { service, prisma, signalsService } = makeService();

    const result = await service.decideSignalById(signal.id);

    expect(result.supervisorDecision.decision).toBe(SupervisorDecisionAction.OPERATE);
    expect(prisma.supervisorDecision.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          signalId: signal.id,
          decision: SupervisorDecisionAction.OPERATE,
        }),
      }),
    );
    expect(prisma.agentDecision.create).toHaveBeenCalled();
    expect(signalsService.updateStatus).toHaveBeenCalledWith(signal.id, SignalStatus.APPROVED);
  });
});
