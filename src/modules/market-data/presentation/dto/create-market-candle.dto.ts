import { ApiProperty } from '@nestjs/swagger';
import { Timeframe } from '@prisma/client';
import { IsDateString, IsEnum, IsNumber, IsString, Min } from 'class-validator';

export class CreateMarketCandleDto {
  @ApiProperty({ example: 'ID_DEL_INSTRUMENTO_BTCUSDT' })
  @IsString()
  instrumentId!: string;

  @ApiProperty({ enum: Timeframe, example: Timeframe.M15 })
  @IsEnum(Timeframe)
  timeframe!: Timeframe;

  @ApiProperty({ example: 42000.5, minimum: 0 })
  @IsNumber()
  @Min(0)
  open!: number;

  @ApiProperty({ example: 42100, minimum: 0 })
  @IsNumber()
  @Min(0)
  high!: number;

  @ApiProperty({ example: 41950, minimum: 0 })
  @IsNumber()
  @Min(0)
  low!: number;

  @ApiProperty({ example: 42080, minimum: 0 })
  @IsNumber()
  @Min(0)
  close!: number;

  @ApiProperty({ example: 123.45, minimum: 0 })
  @IsNumber()
  @Min(0)
  volume!: number;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  @IsDateString()
  timestamp!: string;

  @ApiProperty({ example: 'BINANCE' })
  @IsString()
  source!: string;
}
