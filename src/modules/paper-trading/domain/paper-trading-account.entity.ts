import { PaperTradingAccountStatus } from '@prisma/client';

export class PaperTradingAccountEntity {
  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly initialBalance: number,
    public readonly balance: number,
    public readonly equity: number,
    public readonly currency: string,
    public readonly status: PaperTradingAccountStatus,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
  ) {}
}
