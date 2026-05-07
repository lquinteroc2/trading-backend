import {
  BrokerAccountInfo,
  BrokerBlockedOrderResponse,
  BrokerDryRunOrderResponse,
  BrokerLiveOrderResponse,
  BrokerOrderRequest,
  BrokerPrice,
  BrokerSymbolInfo,
} from './broker.types';

export const BROKER_CONNECTOR = Symbol('BROKER_CONNECTOR');

export interface IBrokerConnector {
  health(): Promise<unknown>;
  getAccountInfo(): Promise<BrokerAccountInfo>;
  getSymbols(): Promise<{ symbols: BrokerSymbolInfo[] }>;
  getPrice(symbol: string): Promise<BrokerPrice>;
  dryRunOrder(orderRequest: BrokerOrderRequest): Promise<BrokerDryRunOrderResponse>;
  placeOrder(orderRequest: BrokerOrderRequest): Promise<BrokerBlockedOrderResponse | BrokerLiveOrderResponse>;
}
