import { ApiPropertyOptional } from '@nestjs/swagger';
import { SignalStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class FindSignalsDto {
  @ApiPropertyOptional({ example: 'ID_DEL_INSTRUMENTO_BTCUSDT' })
  @IsOptional()
  @IsString()
  instrumentId?: string;

  @ApiPropertyOptional({ enum: SignalStatus, example: SignalStatus.PENDING })
  @IsOptional()
  @IsEnum(SignalStatus)
  status?: SignalStatus;
}
