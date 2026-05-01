import { ApiProperty } from '@nestjs/swagger';
import { SignalStatus } from '@prisma/client';
import { IsEnum } from 'class-validator';

export class UpdateSignalStatusDto {
  @ApiProperty({ enum: SignalStatus, example: SignalStatus.APPROVED })
  @IsEnum(SignalStatus)
  status!: SignalStatus;
}
