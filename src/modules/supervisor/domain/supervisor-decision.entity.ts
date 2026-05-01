import { SupervisorDecisionAction } from '@prisma/client';

export class SupervisorDecisionEntity {
  constructor(
    public readonly id: string,
    public readonly signalId: string,
    public readonly decision: SupervisorDecisionAction,
    public readonly reason: string,
    public readonly confidenceScore: number,
    public readonly metadata: unknown,
    public readonly createdAt: Date,
  ) {}
}
