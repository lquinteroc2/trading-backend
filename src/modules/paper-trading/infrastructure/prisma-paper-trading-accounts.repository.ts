import { Injectable } from '@nestjs/common';
import { PaperTradingAccountStatus, Prisma } from '@prisma/client';
import { PrismaService } from '@/database/prisma.service';
import { PaperTradingAccountEntity } from '../domain/paper-trading-account.entity';
import {
  CreatePaperTradingAccountData,
  PaperTradingAccountsRepository,
  UpdatePaperTradingAccountBalanceData,
} from '../domain/paper-trading-accounts.repository';

@Injectable()
export class PrismaPaperTradingAccountsRepository implements PaperTradingAccountsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreatePaperTradingAccountData): Promise<PaperTradingAccountEntity> {
    const account = await this.prisma.paperTradingAccount.create({
      data: {
        name: data.name,
        initialBalance: data.initialBalance,
        balance: data.initialBalance,
        equity: data.initialBalance,
        currency: data.currency ?? 'USD',
      },
    });
    return this.toEntity(account);
  }

  async findMany(): Promise<PaperTradingAccountEntity[]> {
    const accounts = await this.prisma.paperTradingAccount.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return accounts.map((account) => this.toEntity(account));
  }

  async findById(id: string): Promise<PaperTradingAccountEntity | null> {
    const account = await this.prisma.paperTradingAccount.findUnique({ where: { id } });
    return account ? this.toEntity(account) : null;
  }

  async findDefaultActive(): Promise<PaperTradingAccountEntity | null> {
    const account = await this.prisma.paperTradingAccount.findFirst({
      where: { status: PaperTradingAccountStatus.ACTIVE },
      orderBy: { createdAt: 'asc' },
    });
    return account ? this.toEntity(account) : null;
  }

  async updateBalance(
    id: string,
    data: UpdatePaperTradingAccountBalanceData,
  ): Promise<PaperTradingAccountEntity> {
    const account = await this.prisma.paperTradingAccount.update({ where: { id }, data });
    return this.toEntity(account);
  }

  async updateStatus(
    id: string,
    status: PaperTradingAccountStatus,
  ): Promise<PaperTradingAccountEntity> {
    const account = await this.prisma.paperTradingAccount.update({
      where: { id },
      data: { status },
    });
    return this.toEntity(account);
  }

  private toEntity(account: {
    id: string;
    name: string;
    initialBalance: Prisma.Decimal;
    balance: Prisma.Decimal;
    equity: Prisma.Decimal;
    currency: string;
    status: PaperTradingAccountStatus;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return new PaperTradingAccountEntity(
      account.id,
      account.name,
      account.initialBalance.toNumber(),
      account.balance.toNumber(),
      account.equity.toNumber(),
      account.currency,
      account.status,
      account.createdAt,
      account.updatedAt,
    );
  }
}
