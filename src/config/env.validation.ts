import { plainToInstance } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
  validateSync,
} from 'class-validator';

class EnvironmentVariables {
  @IsOptional()
  @IsString()
  NODE_ENV?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  PORT?: number;

  @IsString()
  @IsNotEmpty()
  DATABASE_URL!: string;

  @IsString()
  @IsNotEmpty()
  JWT_SECRET!: string;

  @IsOptional()
  @IsString()
  JWT_EXPIRES_IN?: string;

  @IsOptional()
  @IsString()
  JWT_ACCESS_EXPIRES_IN?: string;

  @IsOptional()
  @IsString()
  JWT_REFRESH_SECRET?: string;

  @IsOptional()
  @IsString()
  JWT_REFRESH_EXPIRES_IN?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  JWT_ACCESS_COOKIE_MAX_AGE_MS?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  JWT_REFRESH_COOKIE_MAX_AGE_MS?: number;

  @IsOptional()
  @IsString()
  CORS_ORIGINS?: string;

  @IsOptional()
  @IsBoolean()
  COOKIE_SECURE?: boolean;

  @IsOptional()
  @IsString()
  COOKIE_SAME_SITE?: string;

  @IsOptional()
  @IsString()
  REDIS_HOST?: string;

  @IsOptional()
  @IsInt()
  REDIS_PORT?: number;

  @IsOptional()
  @IsString()
  REDIS_PASSWORD?: string;

  @IsOptional()
  @IsString()
  BINANCE_API_BASE_URL?: string;

  @IsOptional()
  @IsString()
  MARKET_DATA_DEFAULT_PROVIDER?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  MARKET_DATA_SYNC_DEFAULT_LIMIT?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  MARKET_DATA_SYNC_MAX_LIMIT?: number;

  @IsOptional()
  @IsString()
  TECHNICAL_AGENT_BASE_URL?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  TECHNICAL_ANALYSIS_MIN_CANDLES?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  TECHNICAL_ANALYSIS_DEFAULT_LIMIT?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  TECHNICAL_ANALYSIS_CANDLES_LIMIT?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  TECHNICAL_ANALYSIS_TIMEOUT_MS?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  TECHNICAL_ANALYSIS_QUEUE_CONCURRENCY?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  TECHNICAL_ANALYSIS_QUEUE_DEBOUNCE_MS?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  TECHNICAL_SR_LOOKBACK?: number;

  @IsOptional()
  @Min(0)
  TECHNICAL_SR_TOLERANCE_PERCENT?: number;

  @IsOptional()
  @Min(0)
  TECHNICAL_LOW_VOL_ATR_PERCENT?: number;

  @IsOptional()
  @Min(0)
  TECHNICAL_HIGH_VOL_ATR_PERCENT?: number;

  @IsOptional()
  @IsBoolean()
  TECHNICAL_ENABLE_MULTI_TIMEFRAME?: boolean;

  @IsOptional()
  @IsString()
  TECHNICAL_CONFIRMATION_TIMEFRAMES?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  SIGNAL_MIN_CONFIDENCE?: number;

  @IsOptional()
  @Min(0)
  SIGNAL_ATR_SL_MULTIPLIER?: number;

  @IsOptional()
  @Min(0)
  SIGNAL_ATR_TP_MULTIPLIER?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  SIGNAL_GENERATION_QUEUE_CONCURRENCY?: number;

  @IsOptional()
  @IsBoolean()
  SIGNAL_BLOCK_RANGING_MARKET?: boolean;

  @IsOptional()
  @IsBoolean()
  SIGNAL_BLOCK_MTF_CONFLICT?: boolean;

  @IsOptional()
  @Min(0)
  PAPER_TRADING_DEFAULT_BALANCE?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  PAPER_TRADING_MAX_OPEN_TRADES_PER_SYMBOL?: number;

  @IsOptional()
  @IsBoolean()
  PAPER_TRADING_ENABLED?: boolean;

  @IsOptional()
  @IsInt()
  @Min(1)
  PAPER_TRADING_QUEUE_CONCURRENCY?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  SUPERVISOR_MIN_CONFIDENCE?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  SUPERVISOR_MAX_OPEN_TRADES?: number;

  @IsOptional()
  @Min(0)
  SUPERVISOR_MAX_DRAWDOWN?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  SUPERVISOR_DECISION_QUEUE_CONCURRENCY?: number;

  @IsOptional()
  @IsBoolean()
  ENABLE_LIVE_TRADING?: boolean;

  @IsOptional()
  @IsString()
  BROKER_PROVIDER?: string;

  @IsOptional()
  @IsString()
  MT5_WORKER_BASE_URL?: string;

  @IsOptional()
  @IsString()
  MT5_LOGIN?: string;

  @IsOptional()
  @IsString()
  MT5_PASSWORD?: string;

  @IsOptional()
  @IsString()
  MT5_SERVER?: string;

  @IsOptional()
  @IsString()
  MT5_TERMINAL_PATH?: string;

  @IsOptional()
  @IsBoolean()
  MT5_DRY_RUN?: boolean;

  @IsOptional()
  @IsInt()
  @Min(1)
  MT5_REQUEST_TIMEOUT_MS?: number;
}

export function validateConfig(config: Record<string, unknown>) {
  const validated = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });
  const errors = validateSync(validated, { skipMissingProperties: false });

  if (errors.length > 0) {
    throw new Error(errors.toString());
  }

  return validated;
}
