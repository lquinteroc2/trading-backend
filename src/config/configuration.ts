export default () => ({
  app: {
    env: process.env.NODE_ENV ?? 'development',
    port: parseInt(process.env.PORT ?? '3000', 10),
  },
  jwt: {
    secret: process.env.JWT_SECRET ?? 'change-me',
    expiresIn: process.env.JWT_EXPIRES_IN ?? '1d',
  },
  redis: {
    host: process.env.REDIS_HOST ?? 'localhost',
    port: parseInt(process.env.REDIS_PORT ?? '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
  },
  marketData: {
    defaultProvider: process.env.MARKET_DATA_DEFAULT_PROVIDER ?? 'BINANCE',
    syncDefaultLimit: parseInt(process.env.MARKET_DATA_SYNC_DEFAULT_LIMIT ?? '1000', 10),
    syncMaxLimit: parseInt(process.env.MARKET_DATA_SYNC_MAX_LIMIT ?? '1000', 10),
  },
  binance: {
    apiBaseUrl: process.env.BINANCE_API_BASE_URL ?? 'https://api.binance.com',
  },
  technicalAgent: {
    baseUrl: process.env.TECHNICAL_AGENT_BASE_URL ?? 'http://localhost:8000',
    minCandles: parseInt(process.env.TECHNICAL_ANALYSIS_MIN_CANDLES ?? '200', 10),
    defaultLimit: parseInt(
      process.env.TECHNICAL_ANALYSIS_DEFAULT_LIMIT ??
        process.env.TECHNICAL_ANALYSIS_CANDLES_LIMIT ??
        '500',
      10,
    ),
    timeoutMs: parseInt(process.env.TECHNICAL_ANALYSIS_TIMEOUT_MS ?? '8000', 10),
    queueConcurrency: parseInt(process.env.TECHNICAL_ANALYSIS_QUEUE_CONCURRENCY ?? '5', 10),
    queueDebounceMs: parseInt(process.env.TECHNICAL_ANALYSIS_QUEUE_DEBOUNCE_MS ?? '30000', 10),
  },
  signals: {
    minConfidence: parseInt(process.env.SIGNAL_MIN_CONFIDENCE ?? '50', 10),
    atrStopLossMultiplier: parseFloat(process.env.SIGNAL_ATR_SL_MULTIPLIER ?? '1.5'),
    atrTakeProfitMultiplier: parseFloat(process.env.SIGNAL_ATR_TP_MULTIPLIER ?? '3'),
    queueConcurrency: parseInt(process.env.SIGNAL_GENERATION_QUEUE_CONCURRENCY ?? '5', 10),
  },
  paperTrading: {
    enabled: (process.env.PAPER_TRADING_ENABLED ?? 'true').toLowerCase() === 'true',
    defaultBalance: parseFloat(process.env.PAPER_TRADING_DEFAULT_BALANCE ?? '10000'),
    maxOpenTradesPerSymbol: parseInt(
      process.env.PAPER_TRADING_MAX_OPEN_TRADES_PER_SYMBOL ?? '1',
      10,
    ),
  },
});
