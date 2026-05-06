import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class UpdateActiveRiskProfileDto {
  @ApiPropertyOptional({ example: 'Principal' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: 1, minimum: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  maxRiskPerTradePercent?: number;

  @ApiPropertyOptional({ example: 2, minimum: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  minRiskRewardRatio?: number;

  @ApiPropertyOptional({ example: 3, minimum: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  maxDailyDrawdownPercent?: number;

  @ApiPropertyOptional({ example: 1, minimum: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  maxOpenTrades?: number;
}
