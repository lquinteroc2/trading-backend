import { PaperTradeCloseReason, PaperTradeStatus } from '@prisma/client';
import { PaperTradingController } from '@/modules/paper-trading/presentation/paper-trading.controller';

describe('PaperTradingController', () => {
  it('opens a trade from a signal', async () => {
    const service = { findMany: jest.fn(), findById: jest.fn(), close: jest.fn() };
    const engine = {
      createAccount: jest.fn(),
      findAccounts: jest.fn(),
      findAccountById: jest.fn(),
      openTradeFromSignal: jest.fn(async () => ({ id: 'trade-1', status: PaperTradeStatus.OPEN })),
      evaluateOpenTradesOnCandleId: jest.fn(),
    };
    const controller = new PaperTradingController(service as never, engine as never);

    const response = await controller.openTrade({ signalId: 'signal-1', accountId: 'account-1' });

    expect(response).toEqual({ id: 'trade-1', status: PaperTradeStatus.OPEN });
    expect(engine.openTradeFromSignal).toHaveBeenCalledWith('signal-1', 'account-1');
  });

  it('closes a trade manually', async () => {
    const service = {
      findMany: jest.fn(),
      findById: jest.fn(),
      close: jest.fn(async () => ({ id: 'trade-1', status: PaperTradeStatus.CLOSED })),
    };
    const engine = {
      createAccount: jest.fn(),
      findAccounts: jest.fn(),
      findAccountById: jest.fn(),
      openTradeFromSignal: jest.fn(),
      evaluateOpenTradesOnCandleId: jest.fn(),
    };
    const controller = new PaperTradingController(service as never, engine as never);

    const response = await controller.close('trade-1', {
      closePrice: 120,
      closeReason: PaperTradeCloseReason.MANUAL,
    });

    expect(response).toEqual({ id: 'trade-1', status: PaperTradeStatus.CLOSED });
    expect(service.close).toHaveBeenCalledWith('trade-1', 120, PaperTradeCloseReason.MANUAL);
  });

  it('evaluates open trades for a candle', async () => {
    const service = { findMany: jest.fn(), findById: jest.fn(), close: jest.fn() };
    const engine = {
      createAccount: jest.fn(),
      findAccounts: jest.fn(),
      findAccountById: jest.fn(),
      openTradeFromSignal: jest.fn(),
      evaluateOpenTradesOnCandleId: jest.fn(async () => []),
    };
    const controller = new PaperTradingController(service as never, engine as never);

    const response = await controller.evaluateCandle({ candleId: 'candle-1' });

    expect(response).toEqual([]);
    expect(engine.evaluateOpenTradesOnCandleId).toHaveBeenCalledWith('candle-1');
  });
});
