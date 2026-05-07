import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  BrokerAction,
  BrokerConnectionStatus,
  BrokerOrderSimulationStatus,
  Prisma,
  RiskAssessmentDecision,
  SignalDirection,
  SupervisorDecisionAction,
  SystemMode,
  TradeDirection,
} from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@/database/prisma.service';
import { SystemConfigService } from '@/modules/system/application/system-config.service';
import { BROKER_CONNECTOR, IBrokerConnector } from '../domain/broker-connector.interface';
import { BrokerLiveOrderResponse, BrokerOrderRequest } from '../domain/broker.types';

@Injectable()
export class BrokerService {
  constructor(
    @Inject(BROKER_CONNECTOR)
    private readonly connector: IBrokerConnector,
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly systemConfig: SystemConfigService,
  ) {}

  health() {
    return this.connector.health();
  }

  getAccountInfo() {
    return this.logConnectorCall(BrokerAction.ACCOUNT_INFO, undefined, () =>
      this.connector.getAccountInfo(),
    );
  }

  getSymbols() {
    return this.logConnectorCall(BrokerAction.SYMBOLS, undefined, () => this.connector.getSymbols());
  }

  getPrice(symbol: string) {
    return this.logConnectorCall(BrokerAction.PRICE, { symbol }, () => this.connector.getPrice(symbol));
  }

  async dryRunOrder(orderRequest: BrokerOrderRequest, context?: { signalId?: string; supervisorDecisionId?: string }) {
    const response = await this.logConnectorCall(BrokerAction.DRY_RUN_ORDER, orderRequest, () =>
      this.connector.dryRunOrder(this.withDryRunComment(orderRequest)),
    );

    await this.prisma.brokerOrderSimulation.create({
      data: {
        signalId: context?.signalId,
        supervisorDecisionId: context?.supervisorDecisionId,
        provider: this.provider,
        symbol: orderRequest.symbol,
        direction: orderRequest.direction as TradeDirection,
        volume: orderRequest.volume,
        entryPrice: orderRequest.entryPrice,
        stopLoss: orderRequest.stopLoss,
        takeProfit: orderRequest.takeProfit,
        status: response.wouldExecute
          ? BrokerOrderSimulationStatus.VALIDATED
          : BrokerOrderSimulationStatus.BLOCKED,
        dryRun: true,
        reason: response.reason,
        requestPayload: orderRequest as Prisma.InputJsonObject,
        responsePayload: response as Prisma.InputJsonObject,
      },
    });

    return response;
  }

  async placeOrder(orderRequest: BrokerOrderRequest) {
    const blockedReason = await this.getPlaceOrderBlockedReason();
    if (blockedReason) {
      const response = { blocked: true as const, reason: blockedReason };
      await this.saveConnectionLog({
        action: BrokerAction.PLACE_ORDER,
        status: BrokerConnectionStatus.FAILED,
        requestPayload: this.redactOrder(orderRequest),
        responsePayload: response,
        errorMessage: blockedReason,
      });
      throw new ForbiddenException(response);
    }

    const reason = 'Live order placement is not implemented in Sprint 13';
    const response = { blocked: true as const, reason };
    await this.saveConnectionLog({
      action: BrokerAction.PLACE_ORDER,
      status: BrokerConnectionStatus.FAILED,
      requestPayload: this.redactOrder(orderRequest),
      responsePayload: response,
      errorMessage: reason,
    });
    throw new ForbiddenException(response);
  }

  async placeLiveOrder(orderRequest: BrokerOrderRequest): Promise<BrokerLiveOrderResponse> {
    const response = await this.logConnectorCall(BrokerAction.PLACE_ORDER, orderRequest, () =>
      this.connector.placeOrder({
        ...orderRequest,
        comment: orderRequest.comment ?? 'INVERSIONES_LIVE_LIMITED',
      }),
    );
    if ('blocked' in response && response.blocked) {
      throw new ForbiddenException(response);
    }
    return response as BrokerLiveOrderResponse;
  }

  async dryRunOrderFromSignal(signalId: string) {
    const signal = await this.prisma.tradingSignal.findUnique({
      where: { id: signalId },
      include: { instrument: true, supervisorDecision: true },
    });
    if (!signal) {
      throw new NotFoundException('Signal not found');
    }
    if (signal.direction !== SignalDirection.BUY && signal.direction !== SignalDirection.SELL) {
      throw new BadRequestException('Only BUY or SELL signals can be dry-run orders');
    }
    if (!signal.stopLoss || !signal.takeProfit) {
      throw new BadRequestException('Signal requires stopLoss and takeProfit');
    }

    const riskDecision = await this.prisma.riskAssessment.findFirst({
      where: { signalId, decision: RiskAssessmentDecision.APPROVED },
      orderBy: { createdAt: 'desc' },
    });
    if (!riskDecision) {
      throw new BadRequestException('Signal has no approved RiskDecision');
    }

    if (signal.supervisorDecision?.decision !== SupervisorDecisionAction.OPERATE) {
      throw new BadRequestException('Signal has no SupervisorDecision OPERATE');
    }

    const orderRequest: BrokerOrderRequest = {
      symbol: signal.instrument.brokerSymbol ?? signal.instrument.symbol,
      direction: signal.direction,
      volume: riskDecision.positionSize.toNumber(),
      entryPrice: signal.entryPrice.toNumber(),
      stopLoss: signal.stopLoss.toNumber(),
      takeProfit: signal.takeProfit.toNumber(),
      comment: 'INVERSIONES_DRY_RUN',
    };

    return this.dryRunOrder(orderRequest, {
      signalId,
      supervisorDecisionId: signal.supervisorDecision.id,
    });
  }

  private async getPlaceOrderBlockedReason(): Promise<string | null> {
    const enableLiveTrading = this.config.get<boolean>('broker.enableLiveTrading') ?? false;
    if (!enableLiveTrading) {
      return 'Live trading is disabled';
    }

    const mt5DryRun = this.config.get<boolean>('mt5.dryRun') ?? true;
    if (mt5DryRun) {
      return 'Live trading is disabled';
    }

    const systemConfig = await this.systemConfig.getConfig();
    if (systemConfig.killSwitch) {
      return 'Kill switch is enabled';
    }
    if (systemConfig.mode !== SystemMode.LIVE_LIMITED) {
      return 'System mode is not compatible with live broker execution';
    }
    return null;
  }

  private async logConnectorCall<T>(
    action: BrokerAction,
    requestPayload: unknown,
    call: () => Promise<T>,
  ): Promise<T> {
    try {
      const response = await call();
      await this.saveConnectionLog({
        action,
        status: BrokerConnectionStatus.SUCCESS,
        requestPayload,
        responsePayload: response,
      });
      return response;
    } catch (error) {
      await this.saveConnectionLog({
        action,
        status: BrokerConnectionStatus.FAILED,
        requestPayload,
        errorMessage: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  private saveConnectionLog(input: {
    action: BrokerAction;
    status: BrokerConnectionStatus;
    requestPayload?: unknown;
    responsePayload?: unknown;
    errorMessage?: string;
  }) {
    return this.prisma.brokerConnectionLog.create({
      data: {
        provider: this.provider,
        action: input.action,
        status: input.status,
        requestPayload: this.toJson(input.requestPayload),
        responsePayload: this.toJson(input.responsePayload),
        errorMessage: input.errorMessage,
      },
    });
  }

  private withDryRunComment(orderRequest: BrokerOrderRequest): BrokerOrderRequest {
    return { ...orderRequest, comment: orderRequest.comment ?? 'INVERSIONES_DRY_RUN' };
  }

  private redactOrder(orderRequest: BrokerOrderRequest): Prisma.InputJsonObject {
    return { ...orderRequest };
  }

  private toJson(value: unknown): Prisma.InputJsonValue | undefined {
    if (value === undefined) {
      return undefined;
    }
    return value as Prisma.InputJsonValue;
  }

  private get provider(): string {
    return this.config.get<string>('broker.provider') ?? 'MT5';
  }
}
