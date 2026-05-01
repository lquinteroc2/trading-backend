import { ApiPropertyOptional } from '@nestjs/swagger';
import { SignalStatus, Timeframe } from '@prisma/client';
import { IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';

export class FindSignalsDto {
  @ApiPropertyOptional({ example: 'ID_DEL_INSTRUMENTO_BTCUSDT' })
  @IsOptional()
  @IsString()
  instrumentId?: string;

  @ApiPropertyOptional({ enum: Timeframe, example: Timeframe.M15 })
  @IsOptional()
  @IsEnum(Timeframe)
  timeframe?: Timeframe;

  @ApiPropertyOptional({ enum: SignalStatus, example: SignalStatus.PENDING })
  @IsOptional()
  @IsEnum(SignalStatus)
  status?: SignalStatus;

  @ApiPropertyOptional({ example: '2026-05-01T00:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({ example: '2026-05-02T00:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  to?: string;
}
