import { ApiPropertyOptional } from '@nestjs/swagger';
import { DataSyncStatus, Timeframe } from '@prisma/client';
import { IsDateString, IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';

export class FindSyncJobsDto {
  @ApiPropertyOptional({ example: 'BINANCE' })
  @IsOptional()
  @IsString()
  provider?: string;

  @IsOptional()
  @IsUUID()
  instrumentId?: string;

  @ApiPropertyOptional({ enum: Timeframe })
  @IsOptional()
  @IsEnum(Timeframe)
  timeframe?: Timeframe;

  @ApiPropertyOptional({ enum: DataSyncStatus })
  @IsOptional()
  @IsEnum(DataSyncStatus)
  status?: DataSyncStatus;

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;
}
