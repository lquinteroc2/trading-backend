export type BrokerAccountInfo = {
  connected: boolean;
  login: number | null;
  server: string | null;
  balance: number;
  equity: number;
  margin: number;
  freeMargin: number;
  currency: string | null;
};

export type BrokerSymbolInfo = {
  symbol: string;
  description: string | null;
  visible: boolean;
  tradeMode: string;
};

export type BrokerPrice = {
  symbol: string;
  bid: number;
  ask: number;
  spread: number;
  time: string;
};

export type BrokerOrderRequest = {
  symbol: string;
  direction: 'BUY' | 'SELL';
  volume: number;
  entryPrice: number;
  stopLoss?: number | null;
  takeProfit?: number | null;
  comment?: string;
};

export type BrokerDryRunOrderResponse = {
  dryRun: boolean;
  wouldExecute: boolean;
  reason: string;
  request: BrokerOrderRequest;
};

export type BrokerBlockedOrderResponse = {
  blocked: true;
  reason: string;
};

export type BrokerLiveOrderResponse = {
  executed: boolean;
  brokerOrderId: string;
  symbol: string;
  direction: 'BUY' | 'SELL';
  volume: number;
  requestedPrice: number;
  executedPrice: number;
  spread: number;
  timestamp: string;
};
