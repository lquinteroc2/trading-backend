import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SignalDirection, SourceAgent } from '@prisma/client';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class CreateSignalDto {
  @ApiProperty({ example: 'ID_DEL_INSTRUMENTO_BTCUSDT' })
  @IsString()
  instrumentId!: string;

  @ApiProperty({ enum: SignalDirection, example: SignalDirection.BUY })
  @IsEnum(SignalDirection)
  direction!: SignalDirection;

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

  @ApiProperty({ example: 75, minimum: 0, maximum: 100 })
  @IsInt()
  @Min(0)
  @Max(100)
  confidenceScore!: number;

  @ApiProperty({ enum: SourceAgent, example: SourceAgent.TECHNICAL })
  @IsEnum(SourceAgent)
  sourceAgent!: SourceAgent;

  @ApiPropertyOptional({ example: 'Manual test signal after technical analysis.' })
  @IsOptional()
  @IsString()
  reasoning?: string;

  @ApiPropertyOptional({ example: '2024-01-02T00:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}
