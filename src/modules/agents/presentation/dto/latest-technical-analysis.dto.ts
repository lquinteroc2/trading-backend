import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Timeframe } from '@prisma/client';
import { IsEnum, IsOptional, IsUUID } from 'class-validator';

export class LatestTechnicalAnalysisDto {
  @ApiProperty({
    example: 'ID_DEL_INSTRUMENTO_BTCUSDT',
    description: 'UUID del instrumento usado en el analisis tecnico.',
  })
  @IsUUID()
  instrumentId!: string;

  @ApiPropertyOptional({ enum: Timeframe, example: Timeframe.M15 })
  @IsOptional()
  @IsEnum(Timeframe)
  timeframe?: Timeframe;
}
