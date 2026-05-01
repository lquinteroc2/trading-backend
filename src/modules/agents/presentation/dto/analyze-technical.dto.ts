import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Timeframe } from '@prisma/client';
import { IsEnum, IsInt, IsOptional, IsUUID, Min } from 'class-validator';

export class AnalyzeTechnicalDto {
  @ApiProperty({
    example: 'ID_DEL_INSTRUMENTO_BTCUSDT',
    description: 'UUID del instrumento activo a analizar, por ejemplo BTCUSDT.',
  })
  @IsUUID()
  instrumentId!: string;

  @ApiProperty({ enum: Timeframe, example: Timeframe.M15 })
  @IsEnum(Timeframe)
  timeframe!: Timeframe;

  @ApiPropertyOptional({ minimum: 200, example: 1000 })
  @IsOptional()
  @IsInt()
  @Min(1)
  limit?: number;
}
