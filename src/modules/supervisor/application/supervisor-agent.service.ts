import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import {
  AgentDecisionAction,
  AgentExecutionSource,
  AgentType,
  PaperTradeStatus,
  Prisma,
  RiskAssessmentDecision,
  SignalStatus,
  SupervisorDecisionAction,
  SystemMode,
} from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@/database/prisma.service';
import { SystemConfigService } from '@/modules/system/application/system-config.service';
import { SignalsService } from '@/modules/signals/application/signals.service';
import {
  SupervisorAccountState,
  SupervisorRiskInput,
  SupervisorSignalInput,
  SupervisorSystemConfig,
} from '../domain/supervisor.types';

type SupervisorRuleResult = {
  decision: SupervisorDecisionAction;
  reason: string;
  confidenceScore: number;
  metadata: Record<string, unknown>;
};

@Injectable()
export class SupervisorAgentService {
  private readonly logger = new Logger(SupervisorAgentService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly signalsService: SignalsService,
    private readonly systemConfig: SystemConfigService,
    private readonly config: ConfigService,
  ) {}

  decide(
    signal: SupervisorSignalInput,
    riskDecision: SupervisorRiskInput,
    accountState: SupervisorAccountState,
    systemConfig: SupervisorSystemConfig,
  ): SupervisorRuleResult {
    const minConfidence = this.config.get<number>('supervisor.minConfidence', 70);
    const maxOpenTrades = this.config.get<number>('supervisor.maxOpenTrades', 1);
    const maxDailyDrawdown = this.config.get<number>('supervisor.maxDailyDrawdown', 0.02);
    const dailyDrawdown =
      accountState.dailyPnL < 0 ? Math.abs(accountState.dailyPnL) / accountState.balance : 0;
    const metadata = {
      riskAssessmentId: riskDecision.id,
      riskDecision: riskDecision.decision,
      positionSize: riskDecision.positionSize,
      riskRewardRatio: riskDecision.riskRewardRatio,
      accountState,
      systemConfig,
      constraints: {
        minConfidence,
        maxOpenTrades,
        maxDailyDrawdown,
      },
      dailyDrawdown,
    };

    const blockReasons: string[] = [];
    if (systemConfig.killSwitch) {
      blockReasons.push('Kill switch is active');
    }
    if (systemConfig.mode !== SystemMode.PAPER_TRADING) {
      blockReasons.push(`System mode ${systemConfig.mode} does not allow trading`);
    }
    if (riskDecision.decision !== RiskAssessmentDecision.APPROVED) {
      blockReasons.push(`Risk decision is ${riskDecision.decision}`);
    }
    if (signal.confidenceScore < 50) {
      blockReasons.push(`Signal confidence ${signal.confidenceScore} is below 50`);
    }
    if (accountState.hasOpenTradeForInstrument) {
      blockReasons.push('Instrument already has an open paper trade');
    }
    if (accountState.openTrades >= maxOpenTrades) {
      blockReasons.push(`Open trades ${accountState.openTrades} reached max ${maxOpenTrades}`);
    }
    if (dailyDrawdown >= maxDailyDrawdown) {
      blockReasons.push(
        `Daily drawdown ${dailyDrawdown.toFixed(4)} reached max ${maxDailyDrawdown}`,
      );
    }

    if (blockReasons.length > 0) {
      return {
        decision: SupervisorDecisionAction.BLOCK,
        reason: blockReasons.join('; '),
        confidenceScore: 0,
        metadata,
      };
    }

    if (signal.confidenceScore < minConfidence) {
      return {
        decision: SupervisorDecisionAction.WAIT,
        reason: `Signal confidence ${signal.confidenceScore} is valid but below operating threshold ${minConfidence}`,
        confidenceScore: signal.confidenceScore,
        metadata,
      };
    }

    return {
      decision: SupervisorDecisionAction.OPERATE,
      reason: 'All supervisor conditions satisfied',
      confidenceScore: signal.confidenceScore,
      metadata,
    };
  }

  async decideSignalById(
    signalId: string,
    executionSource: AgentExecutionSource = AgentExecutionSource.MANUAL,
  ) {
    const existing = await this.prisma.supervisorDecision.findUnique({ where: { signalId } });
    if (existing) {
      throw new BadRequestException('Supervisor decision already exists for this signal');
    }

    const signal = await this.signalsService.findById(signalId);
    const riskDecision = await this.getLatestRiskAssessment(signalId);
    const accountState = await this.getAccountState(signal.instrumentId);
    const systemConfig = await this.systemConfig.getConfig();
    const result = this.decide(signal, riskDecision, accountState, systemConfig);

    const supervisorDecision = await this.prisma.supervisorDecision.create({
      data: {
        signalId,
        decision: result.decision,
        reason: result.reason,
        confidenceScore: result.confidenceScore,
        metadata: result.metadata as Prisma.InputJsonValue,
      },
    });

    const agentDecision = await this.prisma.agentDecision.create({
      data: {
        agentType: AgentType.SUPERVISOR,
        instrumentId: signal.instrumentId,
        signalId: signal.id,
        decision: this.toAgentDecisionAction(result.decision),
        executionSource,
        confidenceScore: result.confidenceScore,
        reasoning: result.reason,
        metadata: {
          supervisorDecisionId: supervisorDecision.id,
          ...result.metadata,
        } as Prisma.InputJsonValue,
      },
    });

    if (result.decision === SupervisorDecisionAction.OPERATE) {
      await this.signalsService.updateStatus(signal.id, SignalStatus.APPROVED);
    }

    this.logger.log(
      JSON.stringify({
        event: 'supervisor_decision',
        signalId: signal.id,
        decision: result.decision,
        confidence: result.confidenceScore,
        reason: result.reason,
      }),
    );

    return {
      supervisorDecision,
      agentDecisionId: agentDecision.id,
    };
  }

  async findDecisions() {
    return this.prisma.supervisorDecision.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async findDecisionById(id: string) {
    const decision = await this.prisma.supervisorDecision.findUnique({ where: { id } });
    if (!decision) {
      throw new NotFoundException('Supervisor decision not found');
    }
    return decision;
  }

  private async getLatestRiskAssessment(signalId: string): Promise<SupervisorRiskInput> {
    const assessment = await this.prisma.riskAssessment.findFirst({
      where: { signalId },
      orderBy: { createdAt: 'desc' },
    });
    if (!assessment) {
      throw new NotFoundException('Risk decision not found for signal');
    }
    return {
      id: assessment.id,
      decision: assessment.decision,
      positionSize: assessment.positionSize.toNumber(),
      riskRewardRatio: assessment.riskRewardRatio.toNumber(),
    };
  }

  private async getAccountState(instrumentId: string): Promise<SupervisorAccountState> {
    const account = await this.prisma.paperTradingAccount.findFirst({
      where: { status: 'ACTIVE' },
      orderBy: { createdAt: 'asc' },
    });
    const openTrades = await this.prisma.paperTrade.findMany({
      where: { status: PaperTradeStatus.OPEN },
    });
    const closedToday = await this.prisma.paperTrade.findMany({
      where: {
        status: PaperTradeStatus.CLOSED,
        closedAt: {
          gte: this.startOfToday(),
        },
      },
    });
    const balance = account?.balance.toNumber() ?? 0;
    const equity = account?.equity.toNumber() ?? balance;
    const dailyPnL = closedToday.reduce((total, trade) => total + (trade.pnl?.toNumber() ?? 0), 0);

    return {
      balance,
      equity,
      openTrades: openTrades.length,
      dailyPnL,
      hasOpenTradeForInstrument: openTrades.some((trade) => trade.instrumentId === instrumentId),
    };
  }

  private startOfToday(): Date {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    return date;
  }

  private toAgentDecisionAction(decision: SupervisorDecisionAction): AgentDecisionAction {
    if (decision === SupervisorDecisionAction.OPERATE) {
      return AgentDecisionAction.APPROVE;
    }
    if (decision === SupervisorDecisionAction.WAIT) {
      return AgentDecisionAction.WAIT;
    }
    return AgentDecisionAction.REJECT;
  }
}
