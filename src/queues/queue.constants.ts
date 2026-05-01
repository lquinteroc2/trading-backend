export const QUEUE_NAMES = {
  MARKET_DATA: 'market-data-queue',
  HISTORICAL_MARKET_DATA_SYNC: 'historical-market-data-sync-queue',
  SIGNAL_GENERATION: 'signal-generation-queue',
  AGENT_DECISION: 'agent-decision-queue',
  TECHNICAL_ANALYSIS: 'technical-analysis-queue',
  PAPER_TRADING: 'paper-trading-queue',
} as const;

export const QUEUE_JOBS = {
  SYNC_HISTORICAL_CANDLES: 'sync-historical-candles',
  TECHNICAL_ANALYSIS_ANALYZE: 'technical-analysis.analyze',
} as const;
