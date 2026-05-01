import { ApiPropertyOptional } from '@nestjs/swagger';
import { SignalStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class FindSignalsDto {
  @IsOptional()
  @IsString()
  instrumentId?: string;

  @ApiPropertyOptional({ enum: SignalStatus })
  @IsOptional()
  @IsEnum(SignalStatus)
  status?: SignalStatus;
}
