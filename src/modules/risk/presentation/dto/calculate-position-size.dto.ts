import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CalculatePositionSizeDto {
  @ApiProperty({ example: 10000, minimum: 0 })
  @IsNumber()
  @Min(0)
  accountBalance!: number;

  @ApiProperty({ example: 1, minimum: 0 })
  @IsNumber()
  @Min(0)
  riskPercent!: number;

  @ApiProperty({ example: 42080, minimum: 0 })
  @IsNumber()
  @Min(0)
  entryPrice!: number;

  @ApiProperty({ example: 41500, minimum: 0 })
  @IsNumber()
  @Min(0)
  stopLoss!: number;

  @ApiProperty({ example: 'ID_DEL_INSTRUMENTO_BTCUSDT' })
  @IsString()
  instrumentId!: string;

  @ApiPropertyOptional({ example: 43200, minimum: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  takeProfit?: number;
}
