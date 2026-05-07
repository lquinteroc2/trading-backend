import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EconomicImpact } from '@prisma/client';
import { IsDateString, IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateEconomicEventDto {
  @ApiProperty({ example: 'USD' })
  @IsString()
  @MinLength(3)
  @MaxLength(12)
  currency!: string;

  @ApiProperty({ example: 'Non-Farm Payrolls' })
  @IsString()
  @MinLength(2)
  title!: string;

  @ApiProperty({ enum: EconomicImpact })
  @IsEnum(EconomicImpact)
  impact!: EconomicImpact;

  @ApiProperty({ example: '2026-05-08T12:30:00.000Z' })
  @IsDateString()
  eventTime!: string;

  @ApiProperty({ example: 'manual' })
  @IsString()
  @MinLength(2)
  source!: string;

  @ApiPropertyOptional({ example: 'NFP mensual' })
  @IsOptional()
  @IsString()
  notes?: string;
}
