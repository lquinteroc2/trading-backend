import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CalculatePositionSizeDto {
  @IsNumber()
  @Min(0)
  accountBalance!: number;

  @IsNumber()
  @Min(0)
  riskPercent!: number;

  @IsNumber()
  @Min(0)
  entryPrice!: number;

  @IsNumber()
  @Min(0)
  stopLoss!: number;

  @IsString()
  instrumentId!: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  takeProfit?: number;
}
