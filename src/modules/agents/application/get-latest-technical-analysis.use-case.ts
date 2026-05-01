import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { AgentType, Timeframe } from '@prisma/client';
import { TOKENS } from '@/shared/tokens';
import { AgentDecisionsRepository } from '../domain/agent-decisions.repository';

@Injectable()
export class GetLatestTechnicalAnalysisUseCase {
  constructor(
    @Inject(TOKENS.AGENT_DECISIONS_REPOSITORY)
    private readonly decisionsRepository: AgentDecisionsRepository,
  ) {}

  async execute(instrumentId: string, timeframe?: Timeframe) {
    const decision = await this.decisionsRepository.findLatest({
      agentType: AgentType.TECHNICAL,
      instrumentId,
      timeframe,
    });
    if (!decision) {
      throw new NotFoundException('Technical analysis not found');
    }
    return decision;
  }
}
