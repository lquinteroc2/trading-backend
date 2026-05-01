import { IsUUID } from 'class-validator';

export class EvaluateRiskDto {
  @IsUUID()
  signalId!: string;
}
