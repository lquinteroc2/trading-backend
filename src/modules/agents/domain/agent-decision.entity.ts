import { AgentDecisionAction, AgentType } from '@prisma/client';

export class AgentDecisionEntity {
  constructor(
    public readonly id: string,
    public readonly agentType: AgentType,
    public readonly instrumentId: string,
    public readonly signalId: string | null,
    public readonly decision: AgentDecisionAction,
    public readonly confidenceScore: number,
    public readonly reasoning: string | null,
    public readonly metadata: unknown,
    public readonly createdAt: Date,
  ) {}
}
