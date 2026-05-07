import { ApiPropertyOptional } from '@nestjs/swagger';
import { Timeframe } from '@prisma/client';
import { IsDateString, IsEnum, IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class FindCandlesDto {
  @ApiPropertyOptional({
    example: 'ID_DEL_INSTRUMENTO_BTCUSDT',
    description: 'UUID del instrumento. Usa el id devuelto por GET /api/v1/instruments.',
  })
  @IsOptional()
  @IsString()
  instrumentId?: string;

  @ApiPropertyOptional({ enum: Timeframe, example: Timeframe.M15 })
  @IsOptional()
  @IsEnum(Timeframe)
  timeframe?: Timeframe;

  @ApiPropertyOptional({ example: '2024-01-01T00:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({ example: '2024-01-15T00:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  to?: string;

  @ApiPropertyOptional({ minimum: 1, maximum: 5000, default: 1000, example: 500 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5000)
  limit?: number;

  @ApiPropertyOptional({ enum: ['asc', 'desc'], default: 'asc', example: 'desc' })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  order?: 'asc' | 'desc';
}
