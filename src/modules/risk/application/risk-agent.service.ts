import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import {
  AgentDecisionAction,
  AgentExecutionSource,
  AgentType,
  RiskAssessmentDecision,
  SignalStatus,
} from '@prisma/client';
import { AgentDecisionsRepository } from '@/modules/agents/domain/agent-decisions.repository';
import { InternalEventBus } from '@/events/internal-event-bus.service';
import { TRADING_EVENTS } from '@/events/trading-events';
import { SignalsService } from '@/modules/signals/application/signals.service';
import { TradingSignalEntity } from '@/modules/signals/domain/trading-signal.entity';
import { TOKENS } from '@/shared/tokens';
import { AccountState } from '../domain/account-state';
import { RiskAssessmentEntity } from '../domain/risk-assessment.entity';
import { RiskAssessmentsRepository } from '../domain/risk-assessments.repository';
import { RiskProfileEntity } from '../domain/risk-profile.entity';
import { RiskProfilesRepository } from '../domain/risk-profiles.repository';
import { AccountStateService } from './account-state.service';

export type RiskEvaluationOutput = {
  assessment: RiskAssessmentEntity;
  agentDecisionId: string;
};

type ConstraintSnapshot = {
  maxRiskPerTrade: number;
  maxDailyDrawdown: number;
  maxOpenTrades: number;
  minRiskRewardRatio: number;
};

@Injectable()
export class RiskAgentService {
  constructor(
    private readonly signalsService: SignalsService,
    private readonly accountStateService: AccountStateService,
    @Inject(TOKENS.RISK_PROFILES_REPOSITORY)
    private readonly riskProfilesRepository: RiskProfilesRepository,
    @Inject(TOKENS.RISK_ASSESSMENTS_REPOSITORY)
    private readonly riskAssessmentsRepository: RiskAssessmentsRepository,
    @Inject(TOKENS.AGENT_DECISIONS_REPOSITORY)
    private readonly agentDecisionsRepository: AgentDecisionsRepository,
    @Optional()
    private readonly eventBus?: InternalEventBus,
  ) {}

  async evaluateSignalById(
    signalId: string,
    executionSource: AgentExecutionSource = AgentExecutionSource.MANUAL,
  ): Promise<RiskEvaluationOutput> {
    const signal = await this.signalsService.findById(signalId);
    const profile = await this.getActiveRiskProfile();
    const accountState = this.accountStateService.getCurrentState();

    return this.evaluateSignal(signal, accountState, profile, executionSource);
  }

  async evaluateSignal(
    signal: TradingSignalEntity,
    accountState: AccountState,
    riskProfile: RiskProfileEntity,
    executionSource: AgentExecutionSource = AgentExecutionSource.MANUAL,
  ): Promise<RiskEvaluationOutput> {
    if (signal.stopLoss === null || signal.takeProfit === null) {
      throw new BadRequestException('Signal requires stopLoss and takeProfit for risk evaluation');
    }

    const distanceToStopLoss = Math.abs(signal.entryPrice - signal.stopLoss);
    if (distanceToStopLoss === 0) {
      throw new BadRequestException('Stop loss distance must be greater than zero');
    }

    const monetaryRisk = accountState.balance * riskProfile.maxRiskPerTrade;
    const positionSize = monetaryRisk / distanceToStopLoss;
    const riskRewardRatio = Math.abs(signal.takeProfit - signal.entryPrice) / distanceToStopLoss;
    const dailyDrawdown =
      accountState.dailyPnL < 0 ? Math.abs(accountState.dailyPnL) / accountState.balance : 0;
    const constraints = this.snapshotConstraints(riskProfile);
    const rejectionReasons = this.getRejectionReasons({
      accountState,
      dailyDrawdown,
      monetaryRisk,
      riskProfile,
      riskRewardRatio,
    });

    const decision =
      rejectionReasons.length > 0
        ? RiskAssessmentDecision.REJECTED
        : RiskAssessmentDecision.APPROVED;
    const reason =
      rejectionReasons.length > 0
        ? rejectionReasons.join('; ')
        : `Risk approved. RR ${riskRewardRatio.toFixed(2)} meets minimum ${riskProfile.minRiskRewardRatio}.`;

    const assessment = await this.riskAssessmentsRepository.create({
      signalId: signal.id,
      riskProfileId: riskProfile.id,
      positionSize,
      monetaryRisk,
      riskRewardRatio,
      decision,
      reason,
    });

    const agentDecision = await this.agentDecisionsRepository.create({
      agentType: AgentType.RISK,
      instrumentId: signal.instrumentId,
      signalId: signal.id,
      decision: this.toAgentDecisionAction(decision),
      executionSource,
      confidenceScore: decision === RiskAssessmentDecision.APPROVED ? 100 : 0,
      reasoning: reason,
      metadata: {
        assessmentId: assessment.id,
        riskProfileId: riskProfile.id,
        positionSize,
        monetaryRisk,
        riskRewardRatio,
        distanceToStopLoss,
        balance: accountState.balance,
        equity: accountState.equity,
        openTrades: accountState.openTrades,
        dailyPnL: accountState.dailyPnL,
        dailyDrawdown,
        constraints,
      },
    });

    await this.signalsService.updateStatus(
      signal.id,
      decision === RiskAssessmentDecision.APPROVED ? SignalStatus.APPROVED : SignalStatus.REJECTED,
    );

    if (decision === RiskAssessmentDecision.APPROVED) {
      this.eventBus?.emit(TRADING_EVENTS.RISK_APPROVED, {
        signalId: signal.id,
        instrumentId: signal.instrumentId,
        agentDecisionId: agentDecision.id,
      });
    }

    return { assessment, agentDecisionId: agentDecision.id };
  }

  findAssessments() {
    return this.riskAssessmentsRepository.findMany();
  }

  private async getActiveRiskProfile(): Promise<RiskProfileEntity> {
    const profile = await this.riskProfilesRepository.findActive();
    if (!profile) {
      throw new NotFoundException('Active risk profile not found');
    }
    return profile;
  }

  private getRejectionReasons(input: {
    accountState: AccountState;
    dailyDrawdown: number;
    monetaryRisk: number;
    riskProfile: RiskProfileEntity;
    riskRewardRatio: number;
  }): string[] {
    const reasons: string[] = [];
    if (input.riskRewardRatio < input.riskProfile.minRiskRewardRatio) {
      reasons.push(
        `Risk/reward ${input.riskRewardRatio.toFixed(2)} below minimum ${input.riskProfile.minRiskRewardRatio}`,
      );
    }
    if (input.monetaryRisk > input.accountState.balance * input.riskProfile.maxRiskPerTrade) {
      reasons.push('Monetary risk exceeds max risk per trade');
    }
    if (input.accountState.openTrades >= input.riskProfile.maxOpenTrades) {
      reasons.push(
        `Open trades ${input.accountState.openTrades} reached max ${input.riskProfile.maxOpenTrades}`,
      );
    }
    if (input.dailyDrawdown >= input.riskProfile.maxDailyDrawdown) {
      reasons.push(
        `Daily drawdown ${input.dailyDrawdown.toFixed(4)} reached max ${input.riskProfile.maxDailyDrawdown}`,
      );
    }
    return reasons;
  }

  private snapshotConstraints(profile: RiskProfileEntity): ConstraintSnapshot {
    return {
      maxRiskPerTrade: profile.maxRiskPerTrade,
      maxDailyDrawdown: profile.maxDailyDrawdown,
      maxOpenTrades: profile.maxOpenTrades,
      minRiskRewardRatio: profile.minRiskRewardRatio,
    };
  }

  private toAgentDecisionAction(decision: RiskAssessmentDecision): AgentDecisionAction {
    if (decision === RiskAssessmentDecision.APPROVED) {
      return AgentDecisionAction.APPROVE;
    }
    if (decision === RiskAssessmentDecision.ADJUSTED) {
      return AgentDecisionAction.MODIFY;
    }
    return AgentDecisionAction.REJECT;
  }
}
