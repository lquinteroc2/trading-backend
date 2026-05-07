import { BadGatewayException, RequestTimeoutException } from '@nestjs/common';
import { Mt5BrokerConnector } from '@/modules/broker/infrastructure/mt5-broker.connector';

function makeConnector() {
  const config = {
    get: jest.fn((key: string) => {
      if (key === 'mt5.workerBaseUrl') return 'http://mt5-worker.local';
      if (key === 'mt5.requestTimeoutMs') return 1000;
      return undefined;
    }),
  };
  return new Mt5BrokerConnector(config as never);
}

describe('Mt5BrokerConnector', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
  });

  it('calls MT5 worker account endpoint', async () => {
    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      text: jest.fn(async () => JSON.stringify({ connected: true, login: 123 })),
    } as never);

    const connector = makeConnector();
    const response = await connector.getAccountInfo();

    expect(response).toEqual({ connected: true, login: 123 });
    expect(fetchMock).toHaveBeenCalledWith(
      'http://mt5-worker.local/mt5/account',
      expect.objectContaining({ method: 'GET' }),
    );
  });

  it('calls MT5 worker dry-run endpoint with payload', async () => {
    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      text: jest.fn(async () =>
        JSON.stringify({ dryRun: true, wouldExecute: true, reason: 'ok', request: {} }),
      ),
    } as never);

    const connector = makeConnector();
    await connector.dryRunOrder({
      symbol: 'XAUUSD',
      direction: 'BUY',
      volume: 0.01,
      entryPrice: 2320.35,
      stopLoss: 2315,
      takeProfit: 2330,
    });

    expect(fetchMock).toHaveBeenCalledWith(
      'http://mt5-worker.local/mt5/orders/dry-run',
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('"symbol":"XAUUSD"'),
      }),
    );
  });

  it('normalizes worker errors', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: false,
      status: 503,
      text: jest.fn(async () => JSON.stringify({ detail: 'MT5 unavailable' })),
    } as never);

    await expect(makeConnector().getSymbols()).rejects.toBeInstanceOf(BadGatewayException);
  });

  it('normalizes timeouts', async () => {
    const abortError = new Error('aborted');
    abortError.name = 'AbortError';
    jest.spyOn(global, 'fetch').mockRejectedValue(abortError);

    await expect(makeConnector().getPrice('XAUUSD')).rejects.toBeInstanceOf(
      RequestTimeoutException,
    );
  });
});
