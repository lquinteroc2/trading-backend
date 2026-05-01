import { ApiPropertyOptional } from '@nestjs/swagger';
import { DataSyncStatus, Timeframe } from '@prisma/client';
import { IsDateString, IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';

export class FindSyncJobsDto {
  @ApiPropertyOptional({ example: 'BINANCE' })
  @IsOptional()
  @IsString()
  provider?: string;

  @ApiPropertyOptional({ example: 'ID_DEL_INSTRUMENTO_BTCUSDT' })
  @IsOptional()
  @IsUUID()
  instrumentId?: string;

  @ApiPropertyOptional({ enum: Timeframe, example: Timeframe.M15 })
  @IsOptional()
  @IsEnum(Timeframe)
  timeframe?: Timeframe;

  @ApiPropertyOptional({ enum: DataSyncStatus, example: DataSyncStatus.COMPLETED })
  @IsOptional()
  @IsEnum(DataSyncStatus)
  status?: DataSyncStatus;

  @ApiPropertyOptional({ example: '2024-01-01T00:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({ example: '2024-01-15T00:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  to?: string;
}
