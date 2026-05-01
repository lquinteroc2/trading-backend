import { plainToInstance } from 'class-transformer';
import { IsInt, IsNotEmpty, IsOptional, IsString, Min, validateSync } from 'class-validator';

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
