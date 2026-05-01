import { IsUUID } from 'class-validator';

export class SupervisorDecideDto {
  @IsUUID()
  signalId!: string;
}
