import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AgentDecisionAction, AgentType } from '@prisma/client';
import { IsEnum, IsInt, IsObject, IsOptional, IsString, Max, Min } from 'class-validator';

export class CreateAgentDecisionDto {
  @ApiProperty({ enum: AgentType })
  @IsEnum(AgentType)
  agentType!: AgentType;

  @IsString()
  instrumentId!: string;

  @IsOptional()
  @IsString()
  signalId?: string;

  @ApiProperty({ enum: AgentDecisionAction })
  @IsEnum(AgentDecisionAction)
  decision!: AgentDecisionAction;

  @IsInt()
  @Min(0)
  @Max(100)
  confidenceScore!: number;

  @IsOptional()
  @IsString()
  reasoning?: string;

  @ApiPropertyOptional({ type: Object })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
