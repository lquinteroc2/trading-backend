import { ApiPropertyOptional } from '@nestjs/swagger';
import { EconomicImpact } from '@prisma/client';
import { IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';

export class FindEconomicEventsDto {
  @ApiPropertyOptional({ example: 'USD' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional({ enum: EconomicImpact })
  @IsOptional()
  @IsEnum(EconomicImpact)
  impact?: EconomicImpact;

  @ApiPropertyOptional({ example: '2026-05-01' })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({ example: '2026-05-10' })
  @IsOptional()
  @IsDateString()
  to?: string;
}
