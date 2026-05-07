import { IsDateString, IsEnum, IsIn, IsOptional, IsString } from 'class-validator';
import { AnalyticsExecutionType, Timeframe } from '@prisma/client';

export class AnalyticsQueryDto {
  @IsOptional()
  @IsEnum(AnalyticsExecutionType)
  executionType?: AnalyticsExecutionType;

  @IsOptional()
  @IsString()
  instrumentId?: string;

  @IsOptional()
  @IsString()
  symbol?: string;

  @IsOptional()
  @IsString()
  strategyId?: string;

  @IsOptional()
  @IsEnum(Timeframe)
  timeframe?: Timeframe;

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;
}

export class AnalyticsExportQueryDto extends AnalyticsQueryDto {
  @IsIn(['trades', 'daily', 'weekly', 'strategy', 'symbol'])
  type!: 'trades' | 'daily' | 'weekly' | 'strategy' | 'symbol';
}
