import { Injectable } from '@nestjs/common';
import { BacktestTradeResult } from '@prisma/client';
import { BacktestMetricsData, CreateBacktestTradeData } from '../domain/backtest-runs.repository';

@Injectable()
export class BacktestingMetricsService {
  calculate(
    initialBalance: number,
    balanceHistory: number[],
    trades: CreateBacktestTradeData[],
  ): BacktestMetricsData {
    const closedTrades = trades.filter((trade) => trade.pnl !== null && trade.pnl !== undefined);
    const winningTrades = closedTrades.filter((trade) => trade.result === BacktestTradeResult.WIN);
    const losingTrades = closedTrades.filter((trade) => trade.result === BacktestTradeResult.LOSS);
    const grossProfit = winningTrades.reduce((sum, trade) => sum + (trade.pnl ?? 0), 0);
    const grossLoss = Math.abs(losingTrades.reduce((sum, trade) => sum + (trade.pnl ?? 0), 0));
    const finalBalance = balanceHistory[balanceHistory.length - 1] ?? initialBalance;

    return {
      finalBalance: this.roundMoney(finalBalance),
      totalTrades: closedTrades.length,
      winningTrades: winningTrades.length,
      losingTrades: losingTrades.length,
      winRate:
        closedTrades.length === 0 ? 0 : this.roundRatio(winningTrades.length / closedTrades.length),
      grossProfit: this.roundMoney(grossProfit),
      grossLoss: this.roundMoney(grossLoss),
      profitFactor:
        grossLoss === 0 ? (grossProfit > 0 ? null : 0) : this.roundRatio(grossProfit / grossLoss),
      maxDrawdown: this.roundRatio(this.maxDrawdown(balanceHistory)),
      netPnL: this.roundMoney(finalBalance - initialBalance),
      averageWin:
        winningTrades.length === 0 ? null : this.roundMoney(grossProfit / winningTrades.length),
      averageLoss:
        losingTrades.length === 0 ? null : this.roundMoney(grossLoss / losingTrades.length),
    };
  }

  private maxDrawdown(balanceHistory: number[]): number {
    let peak = balanceHistory[0] ?? 0;
    let maxDrawdown = 0;

    for (const balance of balanceHistory) {
      peak = Math.max(peak, balance);
      if (peak <= 0) {
        continue;
      }
      maxDrawdown = Math.max(maxDrawdown, (peak - balance) / peak);
    }

    return maxDrawdown;
  }

  private roundMoney(value: number): number {
    return Number(value.toFixed(8));
  }

  private roundRatio(value: number): number {
    return Number(value.toFixed(8));
  }
}
