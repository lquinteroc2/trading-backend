import { ApiProperty } from '@nestjs/swagger';
import { Timeframe } from '@prisma/client';
import { IsEnum, IsString } from 'class-validator';

export class GenerateSignalDto {
  @ApiProperty({ example: 'ID_DEL_INSTRUMENTO_BTCUSDT' })
  @IsString()
  instrumentId!: string;

  @ApiProperty({ enum: Timeframe, example: Timeframe.M15 })
  @IsEnum(Timeframe)
  timeframe!: Timeframe;
}
