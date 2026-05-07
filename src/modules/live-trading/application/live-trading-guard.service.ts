import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  LiveTradeStatus,
  ManualTradingDecisionAction,
  Prisma,
  RiskAssessmentDecision,
  Role,
  SignalDirection,
  SignalStatus,
  SupervisorDecisionAction,
  SystemMode,
} from '@prisma/client';
import { PrismaService } from '@/database/prisma.service';
import { SystemConfigService } from '@/modules/system/application/system-config.service';

export type LiveExecutionContext = {
  signal: Prisma.TradingSignalGetPayload<{ include: { instrument: true; supervisorDecision: true } }>;
  user: { id: string; role: Role };
  riskAssessment: Prisma.RiskAssessmentGetPayload<Record<string, never>>;
  manualDecision: Prisma.ManualTradingDecisionGetPayload<Record<string, never>>;
  limits: Prisma.LiveTradingLimitsGetPayload<Record<string, never>>;
  symbol: string;
  volume: number;
};

const LIVE_LIMITS_ID = 'global';

@Injectable()
export class LiveTradingGuardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly systemConfig: SystemConfigService,
  ) {}

  async validateLiveExecution(
    signalId: string,
    userId: string,
    manualDecisionId?: string,
  ): Promise<LiveExecutionContext> {
    const enableLiveTrading = this.config.get<boolean>('broker.enableLiveTrading') ?? false;
    if (!enableLiveTrading) {
      throw new ForbiddenException('ENABLE_LIVE_TRADING must be true');
    }

    const mt5DryRun = this.config.get<boolean>('mt5.dryRun') ?? true;
    if (mt5DryRun) {
      throw new ForbiddenException('MT5_DRY_RUN must be false');
    }

    const systemConfig = await this.systemConfig.getConfig();
    if (systemConfig.killSwitch) {
      throw new ForbiddenException('Kill switch is enabled');
    }
    if (systemConfig.mode !== SystemMode.LIVE_LIMITED) {
      throw new ForbiddenException('SystemMode must be LIVE_LIMITED');
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    if (user.role !== Role.ADMIN) {
      throw new ForbiddenException('Only ADMIN can execute limited live trades');
    }

    const signal = await this.prisma.tradingSignal.findUnique({
      where: { id: signalId },
      include: { instrument: true, supervisorDecision: true },
    });
    if (!signal) {
      throw new NotFoundException('Signal not found');
    }
    if (signal.status === SignalStatus.LIVE_EXECUTED) {
      throw new ForbiddenException('Signal already executed live');
    }
    if (signal.direction !== SignalDirection.BUY && signal.direction !== SignalDirection.SELL) {
      throw new ForbiddenException('Only BUY or SELL signals can be executed live');
    }
    if (!signal.stopLoss || !signal.takeProfit) {
      throw new ForbiddenException('Signal requires stopLoss and takeProfit');
    }

    const riskAssessment = await this.prisma.riskAssessment.findFirst({
      where: { signalId, decision: RiskAssessmentDecision.APPROVED },
      orderBy: { createdAt: 'desc' },
    });
    if (!riskAssessment) {
      throw new ForbiddenException('Signal has no approved RiskDecision');
    }

    if (signal.supervisorDecision?.decision !== SupervisorDecisionAction.OPERATE) {
      throw new ForbiddenException('Signal has no SupervisorDecision OPERATE');
    }

    const manualDecision = await this.prisma.manualTradingDecision.findFirst({
      where: {
        id: manualDecisionId,
        signalId,
        decision: ManualTradingDecisionAction.APPROVE,
      },
      orderBy: { createdAt: 'desc' },
    });
    if (!manualDecision) {
      throw new ForbiddenException('Signal has no manual approval');
    }

    const existingLiveTrade = await this.prisma.liveTrade.findFirst({
      where: { signalId },
      orderBy: { createdAt: 'desc' },
    });
    if (existingLiveTrade) {
      throw new ForbiddenException('Signal already has a live trade');
    }

    const limits = await this.getLimits();
    if (!limits.isActive) {
      throw new ForbiddenException('Live trading limits are inactive');
    }

    const symbol = signal.instrument.brokerSymbol ?? signal.instrument.symbol;
    const allowedSymbols = this.readAllowedSymbols(limits.allowedSymbols);
    if (!allowedSymbols.includes(symbol)) {
      throw new ForbiddenException(`Symbol ${symbol} is not allowed for live trading`);
    }

    const volume = riskAssessment.positionSize.toNumber();
    if (volume > limits.maxVolumePerTrade.toNumber()) {
      throw new ForbiddenException('Volume exceeds maxVolumePerTrade');
    }

    const openSameSymbol = await this.prisma.liveTrade.findFirst({
      where: {
        symbol,
        status: { in: [LiveTradeStatus.REQUESTED, LiveTradeStatus.EXECUTED] },
      },
    });
    if (openSameSymbol) {
      throw new ForbiddenException('There is already an open live trade for this symbol');
    }

    const dayStart = new Date();
    dayStart.setHours(0, 0, 0, 0);
    const dailyLiveTrades = await this.prisma.liveTrade.count({
      where: {
        createdAt: { gte: dayStart },
        status: { in: [LiveTradeStatus.REQUESTED, LiveTradeStatus.EXECUTED] },
      },
    });
    if (dailyLiveTrades >= limits.maxDailyLiveTrades) {
      throw new ForbiddenException('Daily live trade limit reached');
    }

    const dailyLoss = 0;
    if (dailyLoss >= limits.maxDailyLoss.toNumber()) {
      throw new ForbiddenException('Daily live loss limit reached');
    }

    return { signal, user, riskAssessment, manualDecision, limits, symbol, volume };
  }

  async getLimits() {
    return this.prisma.liveTradingLimits.upsert({
      where: { id: LIVE_LIMITS_ID },
      update: {},
      create: {
        id: LIVE_LIMITS_ID,
        maxDailyLiveTrades: 1,
        maxDailyLoss: 50,
        maxVolumePerTrade: 0.01,
        allowedSymbols: ['XAUUSD', 'BTCUSDT'],
        isActive: true,
      },
    });
  }

  private readAllowedSymbols(value: Prisma.JsonValue): string[] {
    return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
  }
}
