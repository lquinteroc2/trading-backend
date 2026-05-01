import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AgentDecisionAction, AgentType } from '@prisma/client';
import { IsEnum, IsInt, IsObject, IsOptional, IsString, Max, Min } from 'class-validator';

export class CreateAgentDecisionDto {
  @ApiProperty({ enum: AgentType, example: AgentType.TECHNICAL })
  @IsEnum(AgentType)
  agentType!: AgentType;

  @ApiProperty({ example: 'ID_DEL_INSTRUMENTO_BTCUSDT' })
  @IsString()
  instrumentId!: string;

  @ApiPropertyOptional({ example: 'ID_DE_SIGNAL_OPCIONAL' })
  @IsOptional()
  @IsString()
  signalId?: string;

  @ApiProperty({ enum: AgentDecisionAction, example: AgentDecisionAction.WAIT })
  @IsEnum(AgentDecisionAction)
  decision!: AgentDecisionAction;

  @ApiProperty({ example: 65, minimum: 0, maximum: 100 })
  @IsInt()
  @Min(0)
  @Max(100)
  confidenceScore!: number;

  @ApiPropertyOptional({ example: 'Technical analysis completed without enough confidence.' })
  @IsOptional()
  @IsString()
  reasoning?: string;

  @ApiPropertyOptional({ type: Object })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
