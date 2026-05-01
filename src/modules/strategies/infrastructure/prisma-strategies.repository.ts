import { Injectable } from '@nestjs/common';
import { Prisma, StrategyStatus } from '@prisma/client';
import { PrismaService } from '@/database/prisma.service';
import { StrategyEntity, StrategyVersionEntity } from '../domain/strategy.entity';
import { StrategiesRepository } from '../domain/strategies.repository';

type StrategyWithVersions = {
  id: string;
  name: string;
  description: string;
  status: StrategyStatus;
  createdAt: Date;
  versions: {
    id: string;
    strategyId: string;
    version: string;
    parameters: Prisma.JsonValue;
    isActive: boolean;
    createdAt: Date;
  }[];
};

@Injectable()
export class PrismaStrategiesRepository implements StrategiesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findActive(): Promise<StrategyEntity[]> {
    const strategies = await this.prisma.strategy.findMany({
      where: { status: StrategyStatus.ACTIVE },
      include: { versions: { where: { isActive: true }, take: 1, orderBy: { createdAt: 'desc' } } },
      orderBy: { createdAt: 'asc' },
    });
    return strategies.map((strategy) => this.toEntity(strategy));
  }

  async findActiveByName(name: string): Promise<StrategyEntity | null> {
    const strategy = await this.prisma.strategy.findFirst({
      where: { name, status: StrategyStatus.ACTIVE },
      include: { versions: { where: { isActive: true }, take: 1, orderBy: { createdAt: 'desc' } } },
    });
    return strategy ? this.toEntity(strategy) : null;
  }

  private toEntity(strategy: StrategyWithVersions): StrategyEntity {
    const activeVersion = strategy.versions[0]
      ? new StrategyVersionEntity(
          strategy.versions[0].id,
          strategy.versions[0].strategyId,
          strategy.versions[0].version,
          strategy.versions[0].parameters,
          strategy.versions[0].isActive,
          strategy.versions[0].createdAt,
        )
      : null;

    return new StrategyEntity(
      strategy.id,
      strategy.name,
      strategy.description,
      strategy.status,
      strategy.createdAt,
      activeVersion,
    );
  }
}
