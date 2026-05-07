import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Timeframe } from '@prisma/client';
import { IsArray, IsEnum, IsInt, IsOptional, IsUUID, Min } from 'class-validator';

export class AnalyzeTechnicalDto {
  @ApiProperty({
    example: 'ID_DEL_INSTRUMENTO_BTCUSDT',
    description: 'UUID del instrumento activo a analizar, por ejemplo BTCUSDT.',
  })
  @IsUUID()
  instrumentId!: string;

  @ApiProperty({ enum: Timeframe, example: Timeframe.M15 })
  @IsOptional()
  @IsEnum(Timeframe)
  timeframe?: Timeframe;

  @ApiPropertyOptional({ enum: Timeframe, example: Timeframe.M15 })
  @IsOptional()
  @IsEnum(Timeframe)
  primaryTimeframe?: Timeframe;

  @ApiPropertyOptional({ enum: Timeframe, isArray: true, example: [Timeframe.H1, Timeframe.H4] })
  @IsOptional()
  @IsArray()
  @IsEnum(Timeframe, { each: true })
  confirmationTimeframes?: Timeframe[];

  @ApiPropertyOptional({ minimum: 200, example: 1000 })
  @IsOptional()
  @IsInt()
  @Min(1)
  limit?: number;
}
