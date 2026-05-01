import { BadRequestException, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import {
  AgentDecisionAction,
  AgentType,
  PaperTradeCloseReason,
  PaperTradeResult,
  PaperTradeStatus,
  PaperTradingAccountStatus,
  SignalDirection,
  SignalStatus,
  TradeDirection,
} from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@/database/prisma.service';
import { MarketCandleEntity } from '@/modules/market-data/domain/market-candle.entity';
import { SignalsService } from '@/modules/signals/application/signals.service';
import { TOKENS } from '@/shared/tokens';
import { PaperTradeEntity } from '../domain/paper-trade.entity';
import { PaperTradingAccountEntity } from '../domain/paper-trading-account.entity';
import { PaperTradingAccountsRepository } from '../domain/paper-trading-accounts.repository';
import { PaperTradesRepository } from '../domain/paper-trades.repository';

type RiskMetadata = {
  positionSize?: unknown;
};

@Injectable()
export class PaperTradingEngineService {
  private readonly logger = new Logger(PaperTradingEngineService.name);

  constructor(
    private readonly signalsService: SignalsService,
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    @Inject(TOKENS.PAPER_TRADES_REPOSITORY)
    private readonly paperTradesRepository: PaperTradesRepository,
    @Inject(TOKENS.PAPER_TRADING_ACCOUNTS_REPOSITORY)
    private readonly accountsRepository: PaperTradingAccountsRepository,
  ) {}

  createAccount(data: { name: string; initialBalance: number; currency?: string }) {
    if (!this.isPositive(data.initialBalance)) {
      throw new BadRequestException('Initial balance must be greater than zero');
    }
    return this.accountsRepository.create(data);
  }

  findAccounts() {
    return this.accountsRepository.findMany();
  }

  async findAccountById(id: string) {
    const account = await this.accountsRepository.findById(id);
    if (!account) {
      throw new NotFoundException('Paper trading account not found');
    }
    return account;
  }

  findTrades(query = {}) {
    return this.paperTradesRepository.findMany(query);
  }

  async findTradeById(id: string) {
    const trade = await this.paperTradesRepository.findById(id);
    if (!trade) {
      throw new NotFoundException('Paper trade not found');
    }
    return trade;
  }

  async openTradeFromSignal(signalId: string, accountId?: string): Promise<PaperTradeEntity> {
    if (!this.config.get<boolean>('paperTrading.enabled')) {
      throw new BadRequestException('Paper trading is disabled');
    }

    const signal = await this.signalsService.findById(signalId);
    if (signal.status !== SignalStatus.APPROVED && signal.status !== SignalStatus.UNDER_REVIEW) {
      throw new BadRequestException('Signal is not approved by risk');
    }
    if (signal.direction !== SignalDirection.BUY && signal.direction !== SignalDirection.SELL) {
      throw new BadRequestException('Only BUY or SELL signals can be opened as paper trades');
    }
    if (!this.isPositive(signal.entryPrice) || !this.isPositive(signal.stopLoss)) {
      throw new BadRequestException('Signal requires valid entryPrice and stopLoss');
    }
    if (!this.isPositive(signal.takeProfit)) {
      throw new BadRequestException('Signal requires valid takeProfit');
    }

    const account = accountId
      ? await this.findAccountById(accountId)
      : await this.getDefaultActiveAccount();
    this.ensureAccountActive(account);

    const existingTradeForSignal = await this.paperTradesRepository.findBySignalId(signal.id);
    if (existingTradeForSignal) {
      throw new BadRequestException('Paper trade already exists for this signal');
    }

    const existingOpenForInstrument = await this.paperTradesRepository.findOpenByInstrument(
      signal.instrumentId,
    );
    if (existingOpenForInstrument) {
      throw new BadRequestException('Instrument already has an open paper trade');
    }

    const maxOpenTradesPerSymbol = this.config.get<number>(
      'paperTrading.maxOpenTradesPerSymbol',
      1,
    );
    if (maxOpenTradesPerSymbol <= 0) {
      throw new BadRequestException('Paper trading max open trades per symbol is zero');
    }

    const riskDecision = await this.findRiskApproval(signal.id);
    if (!riskDecision) {
      throw new BadRequestException('Signal has no approved Risk AgentDecision');
    }

    const positionSize = await this.resolvePositionSize(signal.id, riskDecision.metadata);
    if (!this.isPositive(positionSize)) {
      throw new BadRequestException('Risk approval has invalid position size');
    }

    const trade = await this.paperTradesRepository.create({
      accountId: account.id,
      signalId: signal.id,
      instrumentId: signal.instrumentId,
      direction:
        signal.direction === SignalDirection.BUY ? TradeDirection.BUY : TradeDirection.SELL,
      entryPrice: signal.entryPrice,
      stopLoss: signal.stopLoss,
      takeProfit: signal.takeProfit,
      positionSize,
    });

    this.logger.log(
      JSON.stringify({
        event: 'paper_trade_opened',
        signalId: signal.id,
        tradeId: trade.id,
        entryPrice: trade.entryPrice,
        positionSize: trade.positionSize,
      }),
    );

    await this.recalculateAccountEquity(account.id);
    return trade;
  }

  async closeTrade(
    tradeId: string,
    closePrice: number,
    closeReason: PaperTradeCloseReason,
  ): Promise<PaperTradeEntity> {
    if (!this.isPositive(closePrice)) {
      throw new BadRequestException('Close price must be greater than zero');
    }

    const trade = await this.findTradeById(tradeId);
    if (trade.status !== PaperTradeStatus.OPEN) {
      throw new BadRequestException('Only open paper trades can be closed');
    }

    const account = await this.findAccountById(trade.accountId);
    const pnl =
      trade.direction === TradeDirection.BUY
        ? (closePrice - trade.entryPrice) * trade.positionSize
        : (trade.entryPrice - closePrice) * trade.positionSize;
    const pnlPercent = account.balance === 0 ? 0 : pnl / account.balance;
    const result =
      pnl > 0 ? PaperTradeResult.WIN : pnl < 0 ? PaperTradeResult.LOSS : PaperTradeResult.BREAKEVEN;
    const balanceAfter = account.balance + pnl;

    const closedTrade = await this.paperTradesRepository.close(trade.id, {
      status: PaperTradeStatus.CLOSED,
      closedAt: new Date(),
      closePrice,
      pnl,
      pnlPercent,
      result,
      closeReason,
    });
    await this.accountsRepository.updateBalance(account.id, {
      balance: balanceAfter,
      equity: balanceAfter,
    });
    await this.recalculateAccountEquity(account.id);

    this.logger.log(
      JSON.stringify({
        event: 'paper_trade_closed',
        tradeId: trade.id,
        result,
        pnl,
        balanceAfter,
      }),
    );

    return closedTrade;
  }

  async evaluateOpenTradesOnCandle(candle: MarketCandleEntity): Promise<PaperTradeEntity[]> {
    const openTrades = await this.paperTradesRepository.findMany({
      instrumentId: candle.instrumentId,
      status: PaperTradeStatus.OPEN,
    });
    const closed: PaperTradeEntity[] = [];

    for (const trade of openTrades) {
      const closeInput = this.getCloseInputForCandle(trade, candle);
      if (!closeInput) {
        continue;
      }
      closed.push(await this.closeTrade(trade.id, closeInput.closePrice, closeInput.closeReason));
    }

    return closed;
  }

  async evaluateOpenTradesOnCandleId(candleId: string): Promise<PaperTradeEntity[]> {
    const candle = await this.prisma.marketCandle.findUnique({ where: { id: candleId } });
    if (!candle) {
      throw new NotFoundException('Market candle not found');
    }
    return this.evaluateOpenTradesOnCandle(
      new MarketCandleEntity(
        candle.id,
        candle.instrumentId,
        candle.timeframe,
        candle.open.toNumber(),
        candle.high.toNumber(),
        candle.low.toNumber(),
        candle.close.toNumber(),
        candle.volume.toNumber(),
        candle.timestamp,
        candle.source,
        candle.createdAt,
      ),
    );
  }

  async recalculateAccountEquity(accountId: string): Promise<PaperTradingAccountEntity> {
    const account = await this.findAccountById(accountId);
    const openTrades = await this.paperTradesRepository.findOpenByAccount(accountId);
    const unrealizedPnL = openTrades.reduce((total, trade) => total + (trade.pnl ?? 0), 0);
    return this.accountsRepository.updateBalance(account.id, {
      balance: account.balance,
      equity: account.balance + unrealizedPnL,
    });
  }

  private async getDefaultActiveAccount(): Promise<PaperTradingAccountEntity> {
    const account = await this.accountsRepository.findDefaultActive();
    if (!account) {
      throw new NotFoundException('Active paper trading account not found');
    }
    return account;
  }

  private ensureAccountActive(account: PaperTradingAccountEntity): void {
    if (account.status !== PaperTradingAccountStatus.ACTIVE) {
      throw new BadRequestException('Paper trading account is not active');
    }
  }

  private async findRiskApproval(signalId: string) {
    return this.prisma.agentDecision.findFirst({
      where: {
        signalId,
        agentType: AgentType.RISK,
        decision: AgentDecisionAction.APPROVE,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  private async resolvePositionSize(signalId: string, metadata: unknown): Promise<number> {
    const metadataPositionSize = this.readPositionSizeFromMetadata(metadata);
    if (this.isPositive(metadataPositionSize)) {
      return metadataPositionSize;
    }

    const assessment = await this.prisma.riskAssessment.findFirst({
      where: { signalId },
      orderBy: { createdAt: 'desc' },
    });
    return assessment?.positionSize.toNumber() ?? 0;
  }

  private readPositionSizeFromMetadata(metadata: unknown): number {
    const candidate = metadata as RiskMetadata | null;
    if (!candidate || candidate.positionSize === undefined) {
      return 0;
    }
    const value =
      typeof candidate.positionSize === 'number'
        ? candidate.positionSize
        : Number(candidate.positionSize);
    return Number.isFinite(value) ? value : 0;
  }

  private getCloseInputForCandle(
    trade: PaperTradeEntity,
    candle: MarketCandleEntity,
  ): { closePrice: number; closeReason: PaperTradeCloseReason } | null {
    if (trade.stopLoss === null || trade.takeProfit === null) {
      return null;
    }

    if (trade.direction === TradeDirection.BUY) {
      if (candle.low <= trade.stopLoss) {
        return { closePrice: trade.stopLoss, closeReason: PaperTradeCloseReason.STOP_LOSS };
      }
      if (candle.high >= trade.takeProfit) {
        return { closePrice: trade.takeProfit, closeReason: PaperTradeCloseReason.TAKE_PROFIT };
      }
      return null;
    }

    if (candle.high >= trade.stopLoss) {
      return { closePrice: trade.stopLoss, closeReason: PaperTradeCloseReason.STOP_LOSS };
    }
    if (candle.low <= trade.takeProfit) {
      return { closePrice: trade.takeProfit, closeReason: PaperTradeCloseReason.TAKE_PROFIT };
    }
    return null;
  }

  private isPositive(value: number | null | undefined): value is number {
    return typeof value === 'number' && Number.isFinite(value) && value > 0;
  }
}
