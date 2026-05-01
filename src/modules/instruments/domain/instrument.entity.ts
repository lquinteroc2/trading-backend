import { MarketType } from '@prisma/client';

export class InstrumentEntity {
  constructor(
    public readonly id: string,
    public readonly symbol: string,
    public readonly name: string,
    public readonly marketType: MarketType,
    public readonly brokerSymbol: string | null,
    public readonly isActive: boolean,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
  ) {}
}
