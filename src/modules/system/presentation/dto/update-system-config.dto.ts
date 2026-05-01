import { IsBoolean, IsEnum, IsOptional } from 'class-validator';
import { SystemMode } from '@prisma/client';

export class UpdateSystemConfigDto {
  @IsOptional()
  @IsEnum(SystemMode)
  mode?: SystemMode;

  @IsOptional()
  @IsBoolean()
  killSwitch?: boolean;
}
