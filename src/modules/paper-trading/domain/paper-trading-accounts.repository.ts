import { PaperTradingAccountStatus } from '@prisma/client';
import { PaperTradingAccountEntity } from './paper-trading-account.entity';

export type CreatePaperTradingAccountData = {
  name: string;
  initialBalance: number;
  currency?: string;
};

export type UpdatePaperTradingAccountBalanceData = {
  balance: number;
  equity: number;
};

export interface PaperTradingAccountsRepository {
  create(data: CreatePaperTradingAccountData): Promise<PaperTradingAccountEntity>;
  findMany(): Promise<PaperTradingAccountEntity[]>;
  findById(id: string): Promise<PaperTradingAccountEntity | null>;
  findDefaultActive(): Promise<PaperTradingAccountEntity | null>;
  updateBalance(
    id: string,
    data: UpdatePaperTradingAccountBalanceData,
  ): Promise<PaperTradingAccountEntity>;
  updateStatus(id: string, status: PaperTradingAccountStatus): Promise<PaperTradingAccountEntity>;
}
