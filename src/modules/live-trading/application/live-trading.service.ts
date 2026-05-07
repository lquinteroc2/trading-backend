import { BadRequestException, Injectable, Optional } from '@nestjs/common';
import {
  LiveExecutionAction,
  LiveExecutionStatus,
  LiveTradeStatus,
  Prisma,
  SignalStatus,
} from '@prisma/client';
import { PrismaService } from '@/database/prisma.service';
import { InternalEventBus } from '@/events/internal-event-bus.service';
import { TRADING_EVENTS } from '@/events/trading-events';
import { BrokerService } from '@/modules/broker/application/broker.service';
import { BrokerLiveOrderResponse, BrokerOrderRequest } from '@/modules/broker/domain/broker.types';
import { LiveTradingGuardService } from './live-trading-guard.service';

export const LIVE_CONFIRMATION_TEXT = 'CONFIRMO EJECUCION REAL LIMITADA';

@Injectable()
export class LiveTradingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly guard: LiveTradingGuardService,
    private readonly brokerService: BrokerService,
    @Optional()
    private readonly eventBus?: InternalEventBus,
  ) {}

  async executeLiveFromSignal(signalId: string, userId: string, manualDecisionId: string) {
    this.eventBus?.emit(TRADING_EVENTS.LIVE_EXECUTION_REQUESTED, {
      signalId,
      userId,
      reason: 'Limited live execution requested',
      payload: { manualDecisionId },
    });

    let liveTradeId!: string;
    let orderRequest!: BrokerOrderRequest;
    try {
      const reserved = await this.reserveLiveExecution(signalId, userId, manualDecisionId);
      liveTradeId = reserved.liveTradeId;
      orderRequest = reserved.orderRequest;
      await this.log({
        signalId,
        userId,
        action: LiveExecutionAction.VALIDATION,
        status: LiveExecutionStatus.SUCCESS,
        reason: 'Live execution validation passed',
        payload: { manualDecisionId },
      });
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      await this.log({
        signalId,
        userId,
        action: LiveExecutionAction.BLOCKED,
        status: LiveExecutionStatus.BLOCKED,
        reason,
        payload: { manualDecisionId },
      });
      this.eventBus?.emit(TRADING_EVENTS.LIVE_EXECUTION_BLOCKED, {
        signalId,
        userId,
        reason,
        payload: { manualDecisionId },
      });
      throw error;
    }

    await this.log({
      signalId,
      userId,
      action: LiveExecutionAction.PLACE_ORDER,
      status: LiveExecutionStatus.SUCCESS,
      reason: 'Sending limited live order to broker',
      payload: orderRequest,
    });

    try {
      const brokerResponse = await this.brokerService.placeLiveOrder(orderRequest);
      await this.log({
        signalId,
        userId,
        action: LiveExecutionAction.BROKER_RESPONSE,
        status: LiveExecutionStatus.SUCCESS,
        reason: 'Broker accepted limited live order',
        payload: brokerResponse,
      });
      if (!brokerResponse.executed) {
        throw new BadRequestException('Broker did not execute limited live order');
      }

      const liveTrade = await this.markLiveTradeExecuted(liveTradeId, brokerResponse);
      await this.prisma.tradingSignal.update({
        where: { id: signalId },
        data: { status: SignalStatus.LIVE_EXECUTED },
      });

      this.eventBus?.emit(TRADING_EVENTS.LIVE_EXECUTION_SUCCESS, {
        signalId,
        userId,
        liveTradeId: liveTrade.id,
        reason: 'Limited live execution completed',
        payload: brokerResponse as unknown as Record<string, unknown>,
      });
      this.eventBus?.emit(TRADING_EVENTS.LIVE_TRADE_OPENED, {
        signalId,
        userId,
        liveTradeId: liveTrade.id,
        reason: 'Live trade opened',
        payload: { symbol: liveTrade.symbol, brokerOrderId: liveTrade.brokerOrderId },
      });

      return { liveTrade, brokerResponse };
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      await this.log({
        signalId,
        userId,
        action: LiveExecutionAction.FAILED,
        status: LiveExecutionStatus.FAILED,
        reason,
        payload: orderRequest,
      });
      await this.markLiveTradeFailed(liveTradeId, reason);
      this.eventBus?.emit(TRADING_EVENTS.LIVE_EXECUTION_FAILED, {
        signalId,
        userId,
        reason,
        payload: { manualDecisionId },
      });
      throw error;
    }
  }

  async recordBlockedExecution(signalId: string, userId: string, reason: string, payload?: unknown) {
    await this.log({
      signalId,
      userId,
      action: LiveExecutionAction.BLOCKED,
      status: LiveExecutionStatus.BLOCKED,
      reason,
      payload,
    });
    this.eventBus?.emit(TRADING_EVENTS.LIVE_EXECUTION_BLOCKED, {
      signalId,
      userId,
      reason,
      payload: payload as Record<string, unknown>,
    });
  }

  findTrades() {
    return this.prisma.liveTrade.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async findTradeById(id: string) {
    const trade = await this.prisma.liveTrade.findUnique({ where: { id } });
    if (!trade) {
      throw new BadRequestException('Live trade not found');
    }
    return trade;
  }

  findLogs() {
    return this.prisma.liveExecutionLog.findMany({ orderBy: { createdAt: 'desc' } });
  }

  getLimits() {
    return this.guard.getLimits();
  }

  updateLimits(data: {
    maxDailyLiveTrades?: number;
    maxDailyLoss?: number;
    maxVolumePerTrade?: number;
    allowedSymbols?: string[];
    isActive?: boolean;
  }) {
    return this.prisma.liveTradingLimits.upsert({
      where: { id: 'global' },
      update: {
        maxDailyLiveTrades: data.maxDailyLiveTrades,
        maxDailyLoss: data.maxDailyLoss,
        maxVolumePerTrade: data.maxVolumePerTrade,
        allowedSymbols: data.allowedSymbols,
        isActive: data.isActive,
      },
      create: {
        id: 'global',
        maxDailyLiveTrades: data.maxDailyLiveTrades ?? 1,
        maxDailyLoss: data.maxDailyLoss ?? 50,
        maxVolumePerTrade: data.maxVolumePerTrade ?? 0.01,
        allowedSymbols: data.allowedSymbols ?? ['XAUUSD', 'BTCUSDT'],
        isActive: data.isActive ?? true,
      },
    });
  }

  private async reserveLiveExecution(
    signalId: string,
    userId: string,
    manualDecisionId: string,
  ) {
    try {
      return await this.prisma.$transaction(
        async (tx) => {
          const context = await this.guard.validateLiveExecution(
            signalId,
            userId,
            manualDecisionId,
            tx,
          );
          const orderRequest: BrokerOrderRequest = {
            symbol: context.symbol,
            direction: context.signal.direction as 'BUY' | 'SELL',
            volume: context.volume,
            entryPrice: context.signal.entryPrice.toNumber(),
            stopLoss: context.signal.stopLoss?.toNumber(),
            takeProfit: context.signal.takeProfit?.toNumber(),
            comment: 'INVERSIONES_LIVE_LIMITED',
          };
          const liveTrade = await tx.liveTrade.create({
            data: {
              signalId,
              manualDecisionId: context.manualDecision.id,
              brokerProvider: 'MT5',
              symbol: orderRequest.symbol,
              direction: orderRequest.direction,
              volume: orderRequest.volume,
              entryPrice: orderRequest.entryPrice,
              stopLoss: orderRequest.stopLoss,
              takeProfit: orderRequest.takeProfit,
              status: LiveTradeStatus.REQUESTED,
              requestPayload: orderRequest as Prisma.InputJsonObject,
            },
          });

          return { context, liveTradeId: liveTrade.id, orderRequest };
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034') {
        throw new BadRequestException('Live execution is already in progress for this signal');
      }
      throw error;
    }
  }

  private markLiveTradeExecuted(id: string, response: BrokerLiveOrderResponse) {
    return this.prisma.liveTrade.update({
      where: { id },
      data: {
        brokerOrderId: response.brokerOrderId,
        status: response.executed ? LiveTradeStatus.EXECUTED : LiveTradeStatus.REJECTED,
        responsePayload: response as unknown as Prisma.InputJsonObject,
        errorMessage: response.executed ? undefined : 'Broker did not execute order',
        openedAt: response.executed ? new Date(response.timestamp) : undefined,
      },
    });
  }

  private markLiveTradeFailed(id: string, reason: string) {
    return this.prisma.liveTrade.update({
      where: { id },
      data: {
        status: LiveTradeStatus.FAILED,
        errorMessage: reason,
      },
    });
  }

  private log(input: {
    signalId?: string;
    userId?: string;
    action: LiveExecutionAction;
    status: LiveExecutionStatus;
    reason: string;
    payload?: unknown;
  }) {
    return this.prisma.liveExecutionLog.create({
      data: {
        signalId: input.signalId,
        userId: input.userId,
        action: input.action,
        status: input.status,
        reason: input.reason,
        payload: input.payload as Prisma.InputJsonValue,
      },
    });
  }
}
