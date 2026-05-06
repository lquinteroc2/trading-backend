import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PrismaService } from '@/database/prisma.service';

@ApiTags('agent-decisions')
@Controller('agent-decisions')
export class AgentDecisionsDashboardController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async findMany() {
    const decisions = await this.prisma.agentDecision.findMany({
      orderBy: { createdAt: 'desc' },
      take: 200,
      include: {
        signal: {
          select: {
            paperTrades: {
              select: { id: true },
              take: 1,
            },
            supervisorDecision: {
              select: {
                decision: true,
                reason: true,
              },
            },
          },
        },
      },
    });

    return decisions.map((decision) => ({
      id: decision.id,
      agentType: decision.agentType,
      signalId: decision.signalId,
      tradeId: decision.signal?.paperTrades[0]?.id ?? null,
      decision:
        decision.agentType === 'SUPERVISOR'
          ? (decision.signal?.supervisorDecision?.decision ?? decision.decision)
          : decision.decision,
      confidenceScore: decision.confidenceScore,
      reason: decision.signal?.supervisorDecision?.reason ?? decision.reasoning ?? null,
      reasoning: decision.reasoning,
      createdAt: decision.createdAt,
    }));
  }
}
