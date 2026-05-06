import {
  AgentDecisionAction,
  AgentExecutionSource,
  AgentType,
  RiskAssessmentDecision,
  SignalDirection,
  SignalStatus,
  SourceAgent,
} from '@prisma/client';
import { AgentDecisionsRepository } from '@/modules/agents/domain/agent-decisions.repository';
import { RiskAgentService } from '@/modules/risk/application/risk-agent.service';
import { AccountState } from '@/modules/risk/domain/account-state';
import { RiskAssessmentsRepository } from '@/modules/risk/domain/risk-assessments.repository';
import { RiskProfilesRepository } from '@/modules/risk/domain/risk-profiles.repository';
import { SignalsService } from '@/modules/signals/application/signals.service';
import { TradingSignalEntity } from '@/modules/signals/domain/trading-signal.entity';

describe('RiskAgentService', () => {
  const signal = new TradingSignalEntity(
    'signal-id',
    'instrument-id',
    'strategy-id',
    null,
    SignalDirection.BUY,
    100,
    95,
    112,
    80,
    SignalStatus.CREATED,
    SourceAgent.TECHNICAL,
    null,
    'EMA trend',
    'EMA trend',
    new Date(),
    null,
  );

  const profile = {
    id: 'risk-profile-id',
    name: 'DEFAULT_PROFILE',
    maxRiskPerTrade: 0.01,
    maxDailyDrawdown: 0.02,
    maxOpenTrades: 1,
    minRiskRewardRatio: 2,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const accountState: AccountState = {
    balance: 10_000,
    equity: 10_000,
    openTrades: 0,
    dailyPnL: 0,
  };

  const makeService = () => {
    const signalsService = {
      findById: jest.fn().mockResolvedValue(signal),
      updateStatus: jest.fn().mockResolvedValue({ ...signal, status: SignalStatus.APPROVED }),
    } as unknown as jest.Mocked<SignalsService>;
    const accountStateService = {
      getCurrentState: jest.fn().mockReturnValue(accountState),
    };
    const riskProfilesRepository = {
      findActive: jest.fn().mockResolvedValue(profile),
      findById: jest.fn(),
      upsertDefault: jest.fn(),
      updateActive: jest.fn(),
    } as jest.Mocked<RiskProfilesRepository>;
    const riskAssessmentsRepository = {
      create: jest.fn().mockImplementation((data) =>
        Promise.resolve({
          id: 'assessment-id',
          createdAt: new Date(),
          ...data,
        }),
      ),
      findMany: jest.fn(),
    } as jest.Mocked<RiskAssessmentsRepository>;
    const agentDecisionsRepository = {
      create: jest.fn().mockResolvedValue({ id: 'agent-decision-id' }),
      findMany: jest.fn(),
      findById: jest.fn(),
      findLatest: jest.fn(),
    } as unknown as jest.Mocked<AgentDecisionsRepository>;

    const service = new RiskAgentService(
      signalsService,
      accountStateService,
      riskProfilesRepository,
      riskAssessmentsRepository,
      agentDecisionsRepository,
    );

    return {
      service,
      signalsService,
      riskAssessmentsRepository,
      agentDecisionsRepository,
    };
  };

  it('approves a signal when constraints are satisfied', async () => {
    const { service, signalsService, riskAssessmentsRepository, agentDecisionsRepository } =
      makeService();

    const result = await service.evaluateSignalById('signal-id');

    expect(result.assessment.decision).toBe(RiskAssessmentDecision.APPROVED);
    expect(riskAssessmentsRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        signalId: 'signal-id',
        positionSize: 20,
        monetaryRisk: 100,
        riskRewardRatio: 2.4,
        decision: RiskAssessmentDecision.APPROVED,
      }),
    );
    expect(agentDecisionsRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        agentType: AgentType.RISK,
        decision: AgentDecisionAction.APPROVE,
        executionSource: AgentExecutionSource.MANUAL,
        confidenceScore: 100,
      }),
    );
    expect(signalsService.updateStatus).toHaveBeenCalledWith('signal-id', SignalStatus.APPROVED);
  });

  it('rejects a signal when risk reward is below profile minimum', async () => {
    const { service, signalsService, riskAssessmentsRepository, agentDecisionsRepository } =
      makeService();
    const weakSignal = new TradingSignalEntity(
      signal.id,
      signal.instrumentId,
      signal.strategyId,
      signal.timeframe,
      signal.direction,
      signal.entryPrice,
      signal.stopLoss,
      106,
      signal.confidenceScore,
      signal.status,
      signal.sourceAgent,
      signal.candleTimestamp,
      signal.reason,
      signal.reasoning,
      signal.createdAt,
      signal.expiresAt,
    );

    const result = await service.evaluateSignal(
      weakSignal,
      accountState,
      profile,
      AgentExecutionSource.QUEUE,
    );

    expect(result.assessment.decision).toBe(RiskAssessmentDecision.REJECTED);
    expect(riskAssessmentsRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        riskRewardRatio: 1.2,
        decision: RiskAssessmentDecision.REJECTED,
      }),
    );
    expect(agentDecisionsRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        decision: AgentDecisionAction.REJECT,
        executionSource: AgentExecutionSource.QUEUE,
        confidenceScore: 0,
      }),
    );
    expect(signalsService.updateStatus).toHaveBeenCalledWith('signal-id', SignalStatus.REJECTED);
  });
});
