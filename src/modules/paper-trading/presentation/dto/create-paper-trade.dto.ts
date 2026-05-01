import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TradeDirection } from '@prisma/client';
import { IsEnum, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreatePaperTradeDto {
  @ApiPropertyOptional({ example: 'ID_DE_SIGNAL_OPCIONAL' })
  @IsOptional()
  @IsString()
  signalId?: string;

  @ApiProperty({ example: 'ID_DEL_INSTRUMENTO_BTCUSDT' })
  @IsString()
  instrumentId!: string;

  @ApiProperty({ enum: TradeDirection, example: TradeDirection.BUY })
  @IsEnum(TradeDirection)
  direction!: TradeDirection;

  @ApiProperty({ example: 42080, minimum: 0 })
  @IsNumber()
  @Min(0)
  entryPrice!: number;

  @ApiPropertyOptional({ example: 41500, minimum: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  stopLoss?: number;

  @ApiPropertyOptional({ example: 43200, minimum: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  takeProfit?: number;

  @ApiProperty({ example: 0.01, minimum: 0 })
  @IsNumber()
  @Min(0)
  positionSize!: number;
}
