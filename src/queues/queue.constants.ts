export const QUEUE_NAMES = {
  MARKET_DATA: 'market-data-queue',
  HISTORICAL_MARKET_DATA_SYNC: 'historical-market-data-sync-queue',
  SIGNAL_GENERATION: 'signal-generation-queue',
  AGENT_DECISION: 'agent-decision-queue',
  TECHNICAL_ANALYSIS: 'technical-analysis-queue',
  RISK_EVALUATION: 'risk-evaluation-queue',
  SUPERVISOR_DECISION: 'supervisor-decision-queue',
  PAPER_TRADING: 'paper-trading-queue',
  BROKER_EXECUTION: 'broker-execution-queue',
} as const;

export const QUEUE_JOBS = {
  SYNC_HISTORICAL_CANDLES: 'sync-historical-candles',
  TECHNICAL_ANALYSIS_ANALYZE: 'technical-analysis.analyze',
  SIGNAL_GENERATE: 'signal.generate',
  RISK_EVALUATE: 'risk.evaluate',
  SUPERVISOR_DECIDE: 'supervisor.decide',
  PAPER_TRADE_OPEN: 'paper-trade.open',
  PAPER_TRADE_EVALUATE_OPEN_TRADES: 'paper-trade.evaluate-open-trades',
  BROKER_MT5_DRY_RUN: 'broker.mt5.dry-run',
} as const;
