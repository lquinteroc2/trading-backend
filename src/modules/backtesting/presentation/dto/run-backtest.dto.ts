import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Timeframe } from '@prisma/client';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class RunBacktestDto {
  @ApiProperty({ example: 'ID_DEL_INSTRUMENTO_BTCUSDT' })
  @IsString()
  instrumentId!: string;

  @ApiProperty({ enum: Timeframe, example: Timeframe.M15 })
  @IsEnum(Timeframe)
  timeframe!: Timeframe;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  @IsDateString()
  startDate!: string;

  @ApiProperty({ example: '2024-03-01T00:00:00.000Z' })
  @IsDateString()
  endDate!: string;

  @ApiProperty({ example: 10000, minimum: 1 })
  @IsNumber()
  @IsPositive()
  initialBalance!: number;

  @ApiPropertyOptional({ example: 'EMA_TREND_STRATEGY', default: 'EMA_TREND_STRATEGY' })
  @IsOptional()
  @IsString()
  strategyId?: string;

  @ApiPropertyOptional({ example: 0.01, minimum: 0.0001, maximum: 1, default: 0.01 })
  @IsOptional()
  @IsNumber()
  @Min(0.0001)
  @Max(1)
  riskPercent?: number;

  @ApiPropertyOptional({ example: true, default: false })
  @IsOptional()
  @IsBoolean()
  useSupportResistanceFilter?: boolean;

  @ApiPropertyOptional({ example: true, default: false })
  @IsOptional()
  @IsBoolean()
  useMarketRegimeFilter?: boolean;

  @ApiPropertyOptional({ example: true, default: false })
  @IsOptional()
  @IsBoolean()
  useMultiTimeframeConfirmation?: boolean;
}
