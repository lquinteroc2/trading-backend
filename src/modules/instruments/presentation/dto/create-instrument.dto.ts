import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MarketType } from '@prisma/client';
import { IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateInstrumentDto {
  @ApiProperty({ example: 'XAUUSD' })
  @IsString()
  @MinLength(2)
  @MaxLength(24)
  symbol!: string;

  @ApiProperty({ example: 'Gold vs US Dollar' })
  @IsString()
  @MinLength(2)
  name!: string;

  @ApiProperty({ enum: MarketType })
  @IsEnum(MarketType)
  marketType!: MarketType;

  @ApiPropertyOptional({ example: 'XAUUSD' })
  @IsOptional()
  @IsString()
  brokerSymbol?: string;
}
