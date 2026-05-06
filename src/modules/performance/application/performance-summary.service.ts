import { Injectable } from '@nestjs/common';
import { PaperTradeResult, PaperTradeStatus } from '@prisma/client';
import { PrismaService } from '@/database/prisma.service';

@Injectable()
export class PerformanceSummaryService {
  constructor(private readonly prisma: PrismaService) {}

  async getSummary() {
    const [totalTrades, openTrades, closedTrades] = await Promise.all([
      this.prisma.paperTrade.count(),
      this.prisma.paperTrade.count({ where: { status: PaperTradeStatus.OPEN } }),
      this.prisma.paperTrade.findMany({
        where: { status: PaperTradeStatus.CLOSED },
        orderBy: [{ closedAt: 'asc' }, { openedAt: 'asc' }],
        select: {
          pnl: true,
          result: true,
        },
      }),
    ]);

    const closedCount = closedTrades.length;
    const winningPnls = closedTrades
      .filter((trade) => trade.result === PaperTradeResult.WIN)
      .map((trade) => trade.pnl?.toNumber() ?? 0);
    const losingPnls = closedTrades
      .filter((trade) => trade.result === PaperTradeResult.LOSS)
      .map((trade) => trade.pnl?.toNumber() ?? 0);
    const allPnls = closedTrades.map((trade) => trade.pnl?.toNumber() ?? 0);
    const grossProfit = winningPnls.reduce((total, pnl) => total + pnl, 0);
    const grossLoss = losingPnls.reduce((total, pnl) => total + pnl, 0);
    const netPnl = allPnls.reduce((total, pnl) => total + pnl, 0);
    const averageWin = winningPnls.length ? grossProfit / winningPnls.length : 0;
    const averageLoss = losingPnls.length ? grossLoss / losingPnls.length : 0;
    const winRate = closedCount ? (winningPnls.length / closedCount) * 100 : 0;
    const lossRate = closedCount ? losingPnls.length / closedCount : 0;
    const expectancy = (winRate / 100) * averageWin + lossRate * averageLoss;

    return {
      totalTrades,
      openTrades,
      closedTrades: closedCount,
      winningTrades: winningPnls.length,
      losingTrades: losingPnls.length,
      winRate: this.round(winRate),
      netPnl: this.round(netPnl),
      profitFactor: this.round(this.profitFactor(grossProfit, grossLoss)),
      maxDrawdown: this.round(this.maxDrawdown(allPnls)),
      averageWin: this.round(averageWin),
      averageLoss: this.round(averageLoss),
      expectancy: this.round(expectancy),
    };
  }

  private profitFactor(grossProfit: number, grossLoss: number) {
    const loss = Math.abs(grossLoss);
    if (loss === 0) {
      return grossProfit > 0 ? grossProfit : 0;
    }
    return grossProfit / loss;
  }

  private maxDrawdown(pnls: number[]) {
    let equity = 0;
    let peak = 0;
    let maxDrawdown = 0;

    for (const pnl of pnls) {
      equity += pnl;
      peak = Math.max(peak, equity);
      maxDrawdown = Math.max(maxDrawdown, peak - equity);
    }

    return maxDrawdown;
  }

  private round(value: number) {
    return Math.round(value * 100) / 100;
  }
}
