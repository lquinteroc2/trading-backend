import { Injectable } from '@nestjs/common';
import { AgentDecisionAction, AgentType, Prisma } from '@prisma/client';
import { PrismaService } from '@/database/prisma.service';
import { AgentDecisionEntity } from '../domain/agent-decision.entity';
import {
  AgentDecisionsRepository,
  CreateAgentDecisionData,
  FindLatestAgentDecisionQuery,
} from '../domain/agent-decisions.repository';

@Injectable()
export class PrismaAgentDecisionsRepository implements AgentDecisionsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateAgentDecisionData): Promise<AgentDecisionEntity> {
    const decision = await this.prisma.agentDecision.create({
      data: {
        ...data,
        metadata: data.metadata as Prisma.InputJsonValue,
      },
    });
    return this.toEntity(decision);
  }

  async findMany(): Promise<AgentDecisionEntity[]> {
    const decisions = await this.prisma.agentDecision.findMany({ orderBy: { createdAt: 'desc' } });
    return decisions.map((decision) => this.toEntity(decision));
  }

  async findById(id: string): Promise<AgentDecisionEntity | null> {
    const decision = await this.prisma.agentDecision.findUnique({ where: { id } });
    return decision ? this.toEntity(decision) : null;
  }

  async findLatest(query: FindLatestAgentDecisionQuery): Promise<AgentDecisionEntity | null> {
    const decision = await this.prisma.agentDecision.findFirst({
      where: {
        agentType: query.agentType,
        instrumentId: query.instrumentId,
        metadata: query.timeframe
          ? {
              path: ['timeframe'],
              equals: query.timeframe,
            }
          : undefined,
      },
      orderBy: { createdAt: 'desc' },
    });
    return decision ? this.toEntity(decision) : null;
  }

  private toEntity(decision: {
    id: string;
    agentType: AgentType;
    instrumentId: string;
    signalId: string | null;
    decision: AgentDecisionAction;
    confidenceScore: number;
    reasoning: string | null;
    metadata: Prisma.JsonValue | null;
    createdAt: Date;
  }) {
    return new AgentDecisionEntity(
      decision.id,
      decision.agentType,
      decision.instrumentId,
      decision.signalId,
      decision.decision,
      decision.confidenceScore,
      decision.reasoning,
      decision.metadata,
      decision.createdAt,
    );
  }
}
