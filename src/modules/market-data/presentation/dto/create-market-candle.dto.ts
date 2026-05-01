import { ApiProperty } from '@nestjs/swagger';
import { Timeframe } from '@prisma/client';
import { IsDateString, IsEnum, IsNumber, IsString, Min } from 'class-validator';

export class CreateMarketCandleDto {
  @IsString()
  instrumentId!: string;

  @ApiProperty({ enum: Timeframe })
  @IsEnum(Timeframe)
  timeframe!: Timeframe;

  @IsNumber()
  @Min(0)
  open!: number;

  @IsNumber()
  @Min(0)
  high!: number;

  @IsNumber()
  @Min(0)
  low!: number;

  @IsNumber()
  @Min(0)
  close!: number;

  @IsNumber()
  @Min(0)
  volume!: number;

  @IsDateString()
  timestamp!: string;

  @IsString()
  source!: string;
}
