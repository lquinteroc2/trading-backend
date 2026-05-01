import { StrategyEntity } from './strategy.entity';

export interface StrategiesRepository {
  findActive(): Promise<StrategyEntity[]>;
  findActiveByName(name: string): Promise<StrategyEntity | null>;
}
