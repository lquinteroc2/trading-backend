import { StrategyStatus } from '@prisma/client';

export class StrategyEntity {
  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly description: string,
    public readonly status: StrategyStatus,
    public readonly createdAt: Date,
    public readonly activeVersion: StrategyVersionEntity | null,
  ) {}
}

export class StrategyVersionEntity {
  constructor(
    public readonly id: string,
    public readonly strategyId: string,
    public readonly version: string,
    public readonly parameters: unknown,
    public readonly isActive: boolean,
    public readonly createdAt: Date,
  ) {}
}
