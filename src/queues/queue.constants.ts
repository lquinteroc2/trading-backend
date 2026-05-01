export const QUEUE_NAMES = {
  MARKET_DATA: 'market-data-queue',
  HISTORICAL_MARKET_DATA_SYNC: 'historical-market-data-sync-queue',
  SIGNAL_GENERATION: 'signal-generation-queue',
  AGENT_DECISION: 'agent-decision-queue',
  PAPER_TRADING: 'paper-trading-queue',
} as const;

export const QUEUE_JOBS = {
  SYNC_HISTORICAL_CANDLES: 'sync-historical-candles',
} as const;
