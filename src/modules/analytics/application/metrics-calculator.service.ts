import { Injectable } from '@nestjs/common';
import { AnalyticsTrade, EquityCurvePoint, TradingMetrics } from '../domain/analytics.types';

@Injectable()
export class MetricsCalculatorService {
  calculate(trades: AnalyticsTrade[]): TradingMetrics {
    const totalTrades = trades.length;
    const winning = trades.filter((trade) => trade.pnl > 0);
    const losing = trades.filter((trade) => trade.pnl < 0);
    const breakeven = trades.filter((trade) => trade.pnl === 0);
    const grossProfit = winning.reduce((sum, trade) => sum + trade.pnl, 0);
    const grossLoss = losing.reduce((sum, trade) => sum + trade.pnl, 0);
    const netPnL = trades.reduce((sum, trade) => sum + trade.pnl, 0);
    const winRate = totalTrades ? winning.length / totalTrades : 0;
    const lossRate = totalTrades ? losing.length / totalTrades : 0;
    const averageWin = winning.length ? grossProfit / winning.length : 0;
    const averageLoss = losing.length ? grossLoss / losing.length : 0;
    const riskRewards = trades
      .map((trade) => trade.riskRewardRatio)
      .filter((value): value is number => typeof value === 'number' && Number.isFinite(value));

    return {
      totalTrades,
      winningTrades: winning.length,
      losingTrades: losing.length,
      breakevenTrades: breakeven.length,
      winRate: this.round(winRate),
      lossRate: this.round(lossRate),
      profitFactor: this.round(this.profitFactor(grossProfit, grossLoss)),
      grossProfit: this.round(grossProfit),
      grossLoss: this.round(grossLoss),
      netPnL: this.round(netPnL),
      averageWin: this.round(averageWin),
      averageLoss: this.round(averageLoss),
      expectancy: this.round(winRate * averageWin - lossRate * Math.abs(averageLoss)),
      maxDrawdown: this.round(this.maxDrawdown(trades)),
      averageRiskReward: this.round(
        riskRewards.length ? riskRewards.reduce((sum, value) => sum + value, 0) / riskRewards.length : 0,
      ),
      bestTrade: this.round(totalTrades ? Math.max(...trades.map((trade) => trade.pnl)) : 0),
      worstTrade: this.round(totalTrades ? Math.min(...trades.map((trade) => trade.pnl)) : 0),
    };
  }

  equityCurve(trades: AnalyticsTrade[], initialBalance = 0): EquityCurvePoint[] {
    let balance = initialBalance;
    return [...trades]
      .sort((a, b) => this.tradeDate(a).getTime() - this.tradeDate(b).getTime())
      .map((trade) => {
        balance += trade.pnl;
        return {
          date: this.tradeDate(trade).toISOString(),
          balance: this.round(balance),
          equity: this.round(balance),
          pnl: this.round(trade.pnl),
        };
      });
  }

  private profitFactor(grossProfit: number, grossLoss: number) {
    const loss = Math.abs(grossLoss);
    if (loss === 0) {
      return grossProfit > 0 ? grossProfit : 0;
    }
    return grossProfit / loss;
  }

  private maxDrawdown(trades: AnalyticsTrade[]) {
    let equity = 0;
    let peak = 0;
    let maxDrawdown = 0;
    for (const trade of [...trades].sort((a, b) => this.tradeDate(a).getTime() - this.tradeDate(b).getTime())) {
      equity += trade.pnl;
      peak = Math.max(peak, equity);
      maxDrawdown = Math.max(maxDrawdown, peak - equity);
    }
    return maxDrawdown;
  }

  private tradeDate(trade: AnalyticsTrade) {
    return trade.closedAt ?? trade.openedAt;
  }

  private round(value: number) {
    return Math.round(value * 1000000) / 1000000;
  }
}
