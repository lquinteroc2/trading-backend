import { ApiPropertyOptional } from '@nestjs/swagger';
import { Timeframe } from '@prisma/client';
import { IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';

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
}
