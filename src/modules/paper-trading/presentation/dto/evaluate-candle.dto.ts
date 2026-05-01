import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class EvaluateCandleDto {
  @ApiProperty({ example: 'CANDLE_ID' })
  @IsString()
  candleId!: string;
}
