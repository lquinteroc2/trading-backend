import { AgentDecisionAction, AgentType } from '@prisma/client';
import { AgentDecisionEntity } from './agent-decision.entity';

export type CreateAgentDecisionData = {
  agentType: AgentType;
  instrumentId: string;
  signalId?: string;
  decision: AgentDecisionAction;
  confidenceScore: number;
  reasoning?: string;
  metadata?: unknown;
};

export type FindLatestAgentDecisionQuery = {
  agentType?: AgentType;
  instrumentId?: string;
  timeframe?: string;
};

export interface AgentDecisionsRepository {
  create(data: CreateAgentDecisionData): Promise<AgentDecisionEntity>;
  findMany(): Promise<AgentDecisionEntity[]>;
  findById(id: string): Promise<AgentDecisionEntity | null>;
  findLatest(query: FindLatestAgentDecisionQuery): Promise<AgentDecisionEntity | null>;
}
