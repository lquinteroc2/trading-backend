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

describe('Supervisor assisted trading flow', () => {
  it('marks signal pending manual approval when mode is ASSISTED_TRADING', async () => {
    const prisma = {
      supervisorDecision: {
        findUnique: jest.fn(async () => null),
        create: jest.fn(async (input) => ({
          id: 'supervisor-decision-1',
          createdAt: new Date('2026-05-01T00:00:00.000Z'),
          ...input.data,
        })),
      },
      agentDecision: {
        create: jest.fn(async () => ({ id: 'agent-decision-1' })),
      },
      riskAssessment: {
        findFirst: jest.fn(async () => ({
          id: 'risk-1',
          decision: RiskAssessmentDecision.APPROVED,
          positionSize: { toNumber: () => 2 },
          riskRewardRatio: { toNumber: () => 2.4 },
        })),
      },
      paperTradingAccount: {
        findFirst: jest.fn(async () => ({
          balance: { toNumber: () => 10000 },
          equity: { toNumber: () => 10000 },
        })),
      },
      paperTrade: {
        findMany: jest.fn(async () => []),
      },
      instrument: {
        findUnique: jest.fn(async () => ({ id: signal.instrumentId, symbol: 'BTCUSDT' })),
      },
    };
    const signalsService = {
      findById: jest.fn(async () => signal),
      updateStatus: jest.fn(),
    };
    const systemConfigService = {
      getConfig: jest.fn(async () => ({
        mode: SystemMode.ASSISTED_TRADING,
        killSwitch: false,
      })),
    };
    const config = {
      get: jest.fn((key: string, fallback?: unknown) => fallback),
    };
    const fundamentalAgent = {
      evaluate: jest.fn(async () => ({
        decision: 'ALLOW',
        currency: 'USD',
        windowBeforeMinutes: 15,
        windowAfterMinutes: 15,
        blockingEvent: null,
        reason: 'No hay eventos de alto impacto dentro de la ventana de bloqueo.',
        createdAt: new Date('2026-05-01T00:00:00.000Z'),
      })),
    };
    const assistedTrading = {
      markSignalPendingManualApproval: jest.fn(async () => ({})),
    };

    const service = new SupervisorAgentService(
      prisma as never,
      signalsService as never,
      systemConfigService as never,
      config as never,
      fundamentalAgent as never,
      assistedTrading as never,
    );

    const result = await service.decideSignalById(signal.id);

    expect(result.supervisorDecision.decision).toBe(SupervisorDecisionAction.OPERATE);
    expect(signalsService.updateStatus).not.toHaveBeenCalledWith(signal.id, SignalStatus.APPROVED);
    expect(assistedTrading.markSignalPendingManualApproval).toHaveBeenCalledWith(
      signal.id,
      'supervisor-decision-1',
      'All supervisor conditions satisfied',
    );
    expect(result.systemMode).toBe(SystemMode.ASSISTED_TRADING);
  });
});
