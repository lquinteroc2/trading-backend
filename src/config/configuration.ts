export default () => ({
  app: {
    env: process.env.NODE_ENV ?? 'development',
    port: parseInt(process.env.PORT ?? '3000', 10),
  },
  jwt: {
    secret: process.env.JWT_SECRET ?? 'change-me',
    refreshSecret: process.env.JWT_REFRESH_SECRET ?? process.env.JWT_SECRET ?? 'change-me',
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN ?? process.env.JWT_EXPIRES_IN ?? '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? '7d',
    expiresIn: process.env.JWT_ACCESS_EXPIRES_IN ?? process.env.JWT_EXPIRES_IN ?? '15m',
    accessCookieMaxAgeMs: parseInt(process.env.JWT_ACCESS_COOKIE_MAX_AGE_MS ?? '900000', 10),
    refreshCookieMaxAgeMs: parseInt(process.env.JWT_REFRESH_COOKIE_MAX_AGE_MS ?? '604800000', 10),
  },
  security: {
    corsOrigins: (process.env.CORS_ORIGINS ?? 'http://localhost:3001')
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean),
    cookieSecure:
      (process.env.COOKIE_SECURE ?? (process.env.NODE_ENV === 'production' ? 'true' : 'false'))
        .toLowerCase()
        .trim() === 'true',
    cookieSameSite: (process.env.COOKIE_SAME_SITE ?? 'lax') as 'lax' | 'strict' | 'none',
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
    authAudience: process.env.TECHNICAL_AGENT_AUTH_AUDIENCE || undefined,
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
    supportResistanceLookback: parseInt(process.env.TECHNICAL_SR_LOOKBACK ?? '100', 10),
    supportResistanceTolerancePercent: parseFloat(
      process.env.TECHNICAL_SR_TOLERANCE_PERCENT ?? '0.002',
    ),
    lowVolAtrPercent: parseFloat(process.env.TECHNICAL_LOW_VOL_ATR_PERCENT ?? '0.003'),
    highVolAtrPercent: parseFloat(process.env.TECHNICAL_HIGH_VOL_ATR_PERCENT ?? '0.03'),
    enableMultiTimeframe:
      (process.env.TECHNICAL_ENABLE_MULTI_TIMEFRAME ?? 'true').toLowerCase() === 'true',
    confirmationTimeframes: (process.env.TECHNICAL_CONFIRMATION_TIMEFRAMES ?? 'H1,H4')
      .split(',')
      .map((timeframe) => timeframe.trim())
      .filter(Boolean),
  },
  signals: {
    minConfidence: parseInt(process.env.SIGNAL_MIN_CONFIDENCE ?? '50', 10),
    atrStopLossMultiplier: parseFloat(process.env.SIGNAL_ATR_SL_MULTIPLIER ?? '1.5'),
    atrTakeProfitMultiplier: parseFloat(process.env.SIGNAL_ATR_TP_MULTIPLIER ?? '3'),
    queueConcurrency: parseInt(process.env.SIGNAL_GENERATION_QUEUE_CONCURRENCY ?? '5', 10),
    blockRangingMarket: (process.env.SIGNAL_BLOCK_RANGING_MARKET ?? 'true').toLowerCase() === 'true',
    blockMtfConflict: (process.env.SIGNAL_BLOCK_MTF_CONFLICT ?? 'true').toLowerCase() === 'true',
  },
  paperTrading: {
    enabled: (process.env.PAPER_TRADING_ENABLED ?? 'true').toLowerCase() === 'true',
    defaultBalance: parseFloat(process.env.PAPER_TRADING_DEFAULT_BALANCE ?? '10000'),
    maxOpenTradesPerSymbol: parseInt(
      process.env.PAPER_TRADING_MAX_OPEN_TRADES_PER_SYMBOL ?? '1',
      10,
    ),
  },
  supervisor: {
    minConfidence: parseInt(process.env.SUPERVISOR_MIN_CONFIDENCE ?? '70', 10),
    maxOpenTrades: parseInt(process.env.SUPERVISOR_MAX_OPEN_TRADES ?? '1', 10),
    maxDailyDrawdown: parseFloat(process.env.SUPERVISOR_MAX_DRAWDOWN ?? '0.02'),
    queueConcurrency: parseInt(process.env.SUPERVISOR_DECISION_QUEUE_CONCURRENCY ?? '5', 10),
  },
  broker: {
    enableLiveTrading: (process.env.ENABLE_LIVE_TRADING ?? 'false').toLowerCase() === 'true',
    provider: process.env.BROKER_PROVIDER ?? 'MT5',
  },
  mt5: {
    workerBaseUrl: process.env.MT5_WORKER_BASE_URL ?? 'http://localhost:8010',
    workerAuthAudience: process.env.MT5_WORKER_AUTH_AUDIENCE || undefined,
    workerApiKey: process.env.MT5_WORKER_API_KEY || undefined,
    dryRun: (process.env.MT5_DRY_RUN ?? 'true').toLowerCase() === 'true',
    requestTimeoutMs: parseInt(process.env.MT5_REQUEST_TIMEOUT_MS ?? '10000', 10),
  },
});
