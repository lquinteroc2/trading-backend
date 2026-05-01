import { BadRequestException } from '@nestjs/common';
import {
  AgentDecisionAction,
  AgentExecutionSource,
  AgentType,
  PaperTradeCloseReason,
  PaperTradeResult,
  PaperTradeStatus,
  PaperTradingAccountStatus,
  SignalDirection,
  SignalStatus,
  SourceAgent,
  Timeframe,
  TradeDirection,
} from '@prisma/client';
import { PaperTradingEngineService } from '@/modules/paper-trading/application/paper-trading-engine.service';
import { PaperTradeEntity } from '@/modules/paper-trading/domain/paper-trade.entity';
import { PaperTradingAccountEntity } from '@/modules/paper-trading/domain/paper-trading-account.entity';
import { TradingSignalEntity } from '@/modules/signals/domain/trading-signal.entity';
import { MarketCandleEntity } from '@/modules/market-data/domain/market-candle.entity';

const account = new PaperTradingAccountEntity(
  'account-1',
  'DEFAULT_PAPER_ACCOUNT',
  10000,
  10000,
  10000,
  'USD',
  PaperTradingAccountStatus.ACTIVE,
  new Date('2026-05-01T00:00:00.000Z'),
  new Date('2026-05-01T00:00:00.000Z'),
);

const signal = new TradingSignalEntity(
  'signal-1',
  'instrument-1',
  'strategy-1',
  Timeframe.M15,
  SignalDirection.BUY,
  100,
  90,
  120,
  90,
  SignalStatus.APPROVED,
  SourceAgent.TECHNICAL,
  new Date('2026-05-01T00:00:00.000Z'),
  null,
  null,
  new Date('2026-05-01T00:00:00.000Z'),
  null,
);

function makeTrade(overrides: Partial<PaperTradeEntity> = {}) {
  return new PaperTradeEntity(
    overrides.id ?? 'trade-1',
    overrides.accountId ?? account.id,
    overrides.signalId ?? signal.id,
    overrides.instrumentId ?? signal.instrumentId,
    overrides.direction ?? TradeDirection.BUY,
    overrides.entryPrice ?? 100,
    overrides.stopLoss ?? 90,
    overrides.takeProfit ?? 120,
    overrides.positionSize ?? 2,
    overrides.status ?? PaperTradeStatus.OPEN,
    overrides.openedAt ?? new Date('2026-05-01T00:00:00.000Z'),
    overrides.closedAt ?? null,
    overrides.closePrice ?? null,
    overrides.pnl ?? null,
    overrides.pnlPercent ?? null,
    overrides.result ?? PaperTradeResult.OPEN,
    overrides.closeReason ?? null,
  );
}

function makeEngine(overrides: Record<string, unknown> = {}) {
  const paperTradesRepository = {
    create: jest.fn(async (data) => makeTrade(data)),
    findMany: jest.fn(async () => []),
    findById: jest.fn(async () => makeTrade()),
    findOpenByInstrument: jest.fn(async () => null),
    findOpenByAccount: jest.fn(async () => []),
    findBySignalId: jest.fn(async () => null),
    close: jest.fn(async (_id, data) =>
      makeTrade({
        status: data.status,
        closedAt: data.closedAt,
        closePrice: data.closePrice,
        pnl: data.pnl,
        pnlPercent: data.pnlPercent,
        result: data.result,
        closeReason: data.closeReason,
      }),
    ),
    ...(overrides.paperTradesRepository as object),
  };
  const accountsRepository = {
    create: jest.fn(),
    findMany: jest.fn(),
    findById: jest.fn(async () => account),
    findDefaultActive: jest.fn(async () => account),
    updateBalance: jest.fn(async (_id, data) => ({ ...account, ...data })),
    updateStatus: jest.fn(),
    ...(overrides.accountsRepository as object),
  };
  const prisma = {
    agentDecision: {
      findFirst: jest.fn(async ({ where }) => {
        if (where.agentType === AgentType.SUPERVISOR) {
          return {
            id: 'supervisor-decision-1',
            agentType: AgentType.SUPERVISOR,
            instrumentId: signal.instrumentId,
            signalId: signal.id,
            decision: AgentDecisionAction.APPROVE,
            executionSource: AgentExecutionSource.QUEUE,
            confidenceScore: 90,
            reasoning: 'approved',
            metadata: {},
            createdAt: new Date('2026-05-01T00:00:00.000Z'),
          };
        }
        return {
          id: 'risk-decision-1',
          agentType: AgentType.RISK,
          instrumentId: signal.instrumentId,
          signalId: signal.id,
          decision: AgentDecisionAction.APPROVE,
          executionSource: AgentExecutionSource.QUEUE,
          confidenceScore: 100,
          reasoning: 'approved',
          metadata: { positionSize: 2 },
          createdAt: new Date('2026-05-01T00:00:00.000Z'),
        };
      }),
    },
    riskAssessment: { findFirst: jest.fn() },
    marketCandle: { findUnique: jest.fn() },
    ...(overrides.prisma as object),
  };
  const signalsService = {
    findById: jest.fn(async () => signal),
    ...(overrides.signalsService as object),
  };
  const config = {
    get: jest.fn((key: string, fallback?: unknown) => {
      if (key === 'paperTrading.enabled') return true;
      if (key === 'paperTrading.maxOpenTradesPerSymbol') return 1;
      return fallback;
    }),
  };
  const engine = new PaperTradingEngineService(
    signalsService as never,
    prisma as never,
    config as never,
    paperTradesRepository as never,
    accountsRepository as never,
  );
  return { engine, paperTradesRepository, accountsRepository, prisma, signalsService };
}

describe('PaperTradingEngineService', () => {
  it('opens a trade from a risk-approved signal', async () => {
    const { engine, paperTradesRepository } = makeEngine();

    const trade = await engine.openTradeFromSignal(signal.id, account.id);

    expect(trade.status).toBe(PaperTradeStatus.OPEN);
    expect(trade.positionSize).toBe(2);
    expect(paperTradesRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ signalId: signal.id, accountId: account.id, positionSize: 2 }),
    );
  });

  it('does not open a trade without risk approval', async () => {
    const { engine } = makeEngine({
      prisma: {
        agentDecision: {
          findFirst: jest.fn(async ({ where }) =>
            where.agentType === AgentType.RISK
              ? null
              : {
                  id: 'supervisor-decision-1',
                  metadata: {},
                },
          ),
        },
      },
    });

    await expect(engine.openTradeFromSignal(signal.id, account.id)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('does not open a trade without supervisor approval', async () => {
    const { engine } = makeEngine({
      prisma: {
        agentDecision: {
          findFirst: jest.fn(async ({ where }) =>
            where.agentType === AgentType.SUPERVISOR
              ? null
              : {
                  id: 'risk-decision-1',
                  metadata: { positionSize: 2 },
                },
          ),
        },
      },
    });

    await expect(engine.openTradeFromSignal(signal.id, account.id)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('does not open a duplicate trade for the same signal', async () => {
    const { engine } = makeEngine({
      paperTradesRepository: { findBySignalId: jest.fn(async () => makeTrade()) },
    });

    await expect(engine.openTradeFromSignal(signal.id, account.id)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it.each([
    ['BUY stop loss', TradeDirection.BUY, 89, 110, 90, PaperTradeResult.LOSS],
    ['BUY take profit', TradeDirection.BUY, 95, 121, 120, PaperTradeResult.WIN],
    ['SELL stop loss', TradeDirection.SELL, 95, 111, 110, PaperTradeResult.LOSS],
    ['SELL take profit', TradeDirection.SELL, 79, 105, 80, PaperTradeResult.WIN],
  ])('closes %s on candle evaluation', async (_case, direction, low, high, closePrice, result) => {
    const openTrade = makeTrade({
      direction,
      stopLoss: direction === TradeDirection.BUY ? 90 : 110,
      takeProfit: direction === TradeDirection.BUY ? 120 : 80,
    });
    const { engine, paperTradesRepository } = makeEngine({
      paperTradesRepository: {
        findMany: jest.fn(async () => [openTrade]),
        findById: jest.fn(async () => openTrade),
      },
    });

    const closed = await engine.evaluateOpenTradesOnCandle(
      new MarketCandleEntity(
        'candle-1',
        signal.instrumentId,
        Timeframe.M15,
        100,
        high,
        low,
        100,
        1000,
        new Date('2026-05-01T00:15:00.000Z'),
        'manual',
        new Date('2026-05-01T00:15:00.000Z'),
      ),
    );

    expect(closed).toHaveLength(1);
    expect(paperTradesRepository.close).toHaveBeenCalledWith(
      openTrade.id,
      expect.objectContaining({ closePrice, result }),
    );
  });

  it('calculates PnL and updates balance when closing', async () => {
    const { engine, accountsRepository, paperTradesRepository } = makeEngine();

    await engine.closeTrade('trade-1', 120, PaperTradeCloseReason.TAKE_PROFIT);

    expect(paperTradesRepository.close).toHaveBeenCalledWith(
      'trade-1',
      expect.objectContaining({
        pnl: 40,
        pnlPercent: 0.004,
        result: PaperTradeResult.WIN,
      }),
    );
    expect(accountsRepository.updateBalance).toHaveBeenCalledWith(
      account.id,
      expect.objectContaining({ balance: 10040 }),
    );
  });
});
