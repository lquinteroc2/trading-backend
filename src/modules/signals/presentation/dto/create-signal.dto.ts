import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SignalDirection, SourceAgent } from '@prisma/client';
import { IsDateString, IsEnum, IsInt, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

export class CreateSignalDto {
  @IsString()
  instrumentId!: string;

  @ApiProperty({ enum: SignalDirection })
  @IsEnum(SignalDirection)
  direction!: SignalDirection;

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

  @IsInt()
  @Min(0)
  @Max(100)
  confidenceScore!: number;

  @ApiProperty({ enum: SourceAgent })
  @IsEnum(SourceAgent)
  sourceAgent!: SourceAgent;

  @IsOptional()
  @IsString()
  reasoning?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}
