import { ApiPropertyOptional } from '@nestjs/swagger';
import { Timeframe } from '@prisma/client';
import { IsDateString, IsEnum, IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class FindCandlesDto {
  @IsOptional()
  @IsString()
  instrumentId?: string;

  @ApiPropertyOptional({ enum: Timeframe })
  @IsOptional()
  @IsEnum(Timeframe)
  timeframe?: Timeframe;

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;

  @ApiPropertyOptional({ minimum: 1, example: 1000 })
  @IsOptional()
  @IsInt()
  @Min(1)
  limit?: number;

  @ApiPropertyOptional({ enum: ['asc', 'desc'], default: 'asc' })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  order?: 'asc' | 'desc';
}
