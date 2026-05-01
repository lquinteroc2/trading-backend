import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Timeframe } from '@prisma/client';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

export class SyncHistoricalCandlesDto {
  @ApiProperty({ example: 'ID_DEL_INSTRUMENTO_BTCUSDT' })
  @IsUUID()
  instrumentId!: string;

  @ApiProperty({ enum: Timeframe, example: Timeframe.M15 })
  @IsEnum(Timeframe)
  timeframe!: Timeframe;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  @IsDateString()
  startTime!: string;

  @ApiPropertyOptional({ example: '2024-01-15T00:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  endTime?: string;

  @ApiPropertyOptional({ minimum: 1, maximum: 1000, example: 1000 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1000)
  limit?: number;

  @ApiPropertyOptional({ example: 'BINANCE', default: 'BINANCE' })
  @IsOptional()
  @IsString()
  provider?: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  triggerAnalysis?: boolean;
}
