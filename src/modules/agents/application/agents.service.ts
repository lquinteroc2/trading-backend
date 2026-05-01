import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { TOKENS } from '@/shared/tokens';
import {
  AgentDecisionsRepository,
  CreateAgentDecisionData,
} from '../domain/agent-decisions.repository';

@Injectable()
export class AgentsService {
  constructor(
    @Inject(TOKENS.AGENT_DECISIONS_REPOSITORY)
    private readonly decisionsRepository: AgentDecisionsRepository,
  ) {}

  createDecision(data: CreateAgentDecisionData) {
    return this.decisionsRepository.create(data);
  }

  findDecisions() {
    return this.decisionsRepository.findMany();
  }

  async findDecisionById(id: string) {
    const decision = await this.decisionsRepository.findById(id);
    if (!decision) {
      throw new NotFoundException('Agent decision not found');
    }
    return decision;
  }
}
