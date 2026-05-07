import { IsEnum, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { TradeDirection } from '@prisma/client';

export class BrokerOrderDto {
  @IsString()
  symbol!: string;

  @IsEnum(TradeDirection)
  direction!: TradeDirection;

  @IsNumber()
  @Min(0.00000001)
  volume!: number;

  @IsNumber()
  @Min(0.00000001)
  entryPrice!: number;

  @IsOptional()
  @IsNumber()
  @Min(0.00000001)
  stopLoss?: number;

  @IsOptional()
  @IsNumber()
  @Min(0.00000001)
  takeProfit?: number;
}

export class DryRunFromSignalDto {
  @IsString()
  signalId!: string;
}
