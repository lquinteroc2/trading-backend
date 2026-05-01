import { ApiPropertyOptional } from '@nestjs/swagger';
import { BacktestStatus } from '@prisma/client';
import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class FindBacktestsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  instrumentId?: string;

  @ApiPropertyOptional({ example: 'ema-trend-strategy' })
  @IsOptional()
  @IsString()
  strategyId?: string;

  @ApiPropertyOptional({ enum: BacktestStatus })
  @IsOptional()
  @IsEnum(BacktestStatus)
  status?: BacktestStatus;

  @ApiPropertyOptional({ minimum: 1, default: 50 })
  @IsOptional()
  @IsInt()
  @Min(1)
  limit?: number;
}
