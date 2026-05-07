import { IsDateString, IsEnum, IsOptional, IsString, MinLength } from 'class-validator';
import { ManualExecutionTarget, Timeframe } from '@prisma/client';

export class ApproveAssistedSignalDto {
  @IsEnum(ManualExecutionTarget)
  executionTarget!: ManualExecutionTarget;

  @IsString()
  @MinLength(3)
  reason!: string;
}

export class RejectAssistedSignalDto {
  @IsString()
  @MinLength(3)
  reason!: string;
}

export class FindPendingAssistedSignalsDto {
  @IsOptional()
  @IsString()
  instrumentId?: string;

  @IsOptional()
  @IsEnum(Timeframe)
  timeframe?: Timeframe;

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;
}
