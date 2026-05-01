import { ApiProperty } from '@nestjs/swagger';
import { TradeDirection } from '@prisma/client';
import { IsEnum, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreatePaperTradeDto {
  @IsOptional()
  @IsString()
  signalId?: string;

  @IsString()
  instrumentId!: string;

  @ApiProperty({ enum: TradeDirection })
  @IsEnum(TradeDirection)
  direction!: TradeDirection;

  @IsNumber()
  @Min(0)
  entryPrice!: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  stopLoss?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  takeProfit?: number;

  @IsNumber()
  @Min(0)
  positionSize!: number;
}
