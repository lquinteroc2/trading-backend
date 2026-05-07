import { IsArray, IsBoolean, IsInt, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class ExecuteLiveSignalDto {
  @IsString()
  manualDecisionId!: string;

  @IsString()
  confirmationText!: string;
}

export class UpdateLiveTradingLimitsDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  maxDailyLiveTrades?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  maxDailyLoss?: number;

  @IsOptional()
  @IsNumber()
  @Min(0.00000001)
  maxVolumePerTrade?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allowedSymbols?: string[];

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
