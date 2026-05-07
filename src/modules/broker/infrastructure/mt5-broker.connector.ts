import { BadGatewayException, Injectable, RequestTimeoutException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IBrokerConnector } from '../domain/broker-connector.interface';
import {
  BrokerAccountInfo,
  BrokerBlockedOrderResponse,
  BrokerDryRunOrderResponse,
  BrokerLiveOrderResponse,
  BrokerOrderRequest,
  BrokerPrice,
  BrokerSymbolInfo,
} from '../domain/broker.types';

@Injectable()
export class Mt5BrokerConnector implements IBrokerConnector {
  private readonly baseUrl: string;
  private readonly timeoutMs: number;

  constructor(private readonly config: ConfigService) {
    this.baseUrl = this.config.get<string>('mt5.workerBaseUrl') ?? 'http://localhost:8010';
    this.timeoutMs = this.config.get<number>('mt5.requestTimeoutMs') ?? 10000;
  }

  health(): Promise<unknown> {
    return this.request('GET', '/health');
  }

  getAccountInfo(): Promise<BrokerAccountInfo> {
    return this.request('GET', '/mt5/account');
  }

  getSymbols(): Promise<{ symbols: BrokerSymbolInfo[] }> {
    return this.request('GET', '/mt5/symbols');
  }

  getPrice(symbol: string): Promise<BrokerPrice> {
    return this.request('GET', `/mt5/prices/${encodeURIComponent(symbol)}`);
  }

  dryRunOrder(orderRequest: BrokerOrderRequest): Promise<BrokerDryRunOrderResponse> {
    return this.request('POST', '/mt5/orders/dry-run', orderRequest);
  }

  placeOrder(orderRequest: BrokerOrderRequest): Promise<BrokerBlockedOrderResponse | BrokerLiveOrderResponse> {
    return this.request('POST', '/mt5/orders/place', orderRequest);
  }

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const abortController = new AbortController();
    const timeout = setTimeout(() => abortController.abort(), this.timeoutMs);
    let response: Response;

    try {
      response = await fetch(`${this.baseUrl}${path}`, {
        method,
        headers: body ? { 'Content-Type': 'application/json' } : undefined,
        body: body ? JSON.stringify(body) : undefined,
        signal: abortController.signal,
      });
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new RequestTimeoutException(
          `MT5 worker timed out after ${this.timeoutMs}ms at ${this.baseUrl}`,
        );
      }
      throw new BadGatewayException(
        `MT5 worker is unreachable at ${this.baseUrl}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    } finally {
      clearTimeout(timeout);
    }

    const text = await response.text();
    let payload: unknown = {};
    if (text.length > 0) {
      try {
        payload = JSON.parse(text);
      } catch (error) {
        throw new BadGatewayException(
          `MT5 worker returned invalid JSON: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
    }

    if (!response.ok) {
      throw new BadGatewayException(
        `MT5 worker returned ${response.status}: ${JSON.stringify(payload).slice(0, 300)}`,
      );
    }

    return payload as T;
  }
}
