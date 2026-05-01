import { Injectable } from '@nestjs/common';
import {
  AgentDecisionAction,
  AgentExecutionSource,
  AgentType,
  BacktestTradeResult,
  SignalDirection,
  Timeframe,
  TradeDirection,
} from '@prisma/client';
import { AgentDecisionEntity } from '@/modules/agents/domain/agent-decision.entity';
import { MarketCandleEntity } from '@/modules/market-data/domain/market-candle.entity';
import { StrategyEngineService } from '@/modules/strategies/application/strategy-engine.service';
import { StrategyEntity } from '@/modules/strategies/domain/strategy.entity';
import { CreateBacktestTradeData } from '../domain/backtest-runs.repository';
import { BacktestingIndicatorsService } from './backtesting-indicators.service';
import { BacktestingMetricsService } from './backtesting-metrics.service';

type RunBacktestEngineInput = {
  backtestRunId: string;
  strategy: StrategyEntity;
  instrumentId: string;
  symbol: string;
  timeframe: Timeframe;
  initialBalance: number;
  riskPercent?: number;
  candles: MarketCandleEntity[];
};

type OpenTrade = CreateBacktestTradeData;

@Injectable()
export class BacktestingEngineService {
  constructor(
    private readonly strategyEngine: StrategyEngineService,
    private readonly indicators: BacktestingIndicatorsService,
    private readonly metrics: BacktestingMetricsService,
  ) {}

  async run(input: RunBacktestEngineInput) {
    const trades: CreateBacktestTradeData[] = [];
    const openTrades: OpenTrade[] = [];
    const balanceHistory = [input.initialBalance];
    const riskPercent = input.riskPercent ?? 0.01;
    let balance = input.initialBalance;

    for (let index = 0; index < input.candles.length; index += 1) {
      const candle = input.candles[index];
      const closedTrades = this.closeTriggeredTrades(openTrades, candle, balance);
      for (const closedTrade of closedTrades) {
        balance = this.roundMoney(balance + (closedTrade.pnl ?? 0));
        balanceHistory.push(balance);
        trades.push(closedTrade);
      }

      const historicalWindow = input.candles.slice(0, index + 1);
      const technicalAnalysis = this.syntheticTechnicalAnalysis(
        input.instrumentId,
        candle,
        historicalWindow,
      );
      const result = this.strategyEngine.evaluateStrategy(input.strategy, {
        instrumentId: input.instrumentId,
        symbol: input.symbol,
        timeframe: input.timeframe,
        technicalAnalysis,
        latestCandle: candle,
        candles: historicalWindow,
      });

      const nextCandle = input.candles[index + 1];
      if (
        !result?.shouldCreateSignal ||
        !nextCandle ||
        index + 2 >= input.candles.length ||
        (result.direction !== SignalDirection.BUY && result.direction !== SignalDirection.SELL)
      ) {
        continue;
      }

      if (result.stopLoss === undefined || result.takeProfit === undefined) {
        continue;
      }

      const direction =
        result.direction === SignalDirection.BUY ? TradeDirection.BUY : TradeDirection.SELL;
      const entryPrice = nextCandle.close;
      const stopLoss = result.stopLoss;
      const takeProfit = result.takeProfit;
      const riskPerUnit = Math.abs(entryPrice - stopLoss);
      if (riskPerUnit <= 0) {
        continue;
      }

      openTrades.push({
        backtestRunId: input.backtestRunId,
        signalId: null,
        direction,
        entryPrice,
        stopLoss,
        takeProfit,
        positionSize: this.roundMoney((balance * riskPercent) / riskPerUnit),
        openedAt: nextCandle.timestamp,
      });
    }

    const lastCandle = input.candles[input.candles.length - 1];
    for (const closedTrade of this.closeRemainingTrades(openTrades, lastCandle, balance)) {
      balance = this.roundMoney(balance + (closedTrade.pnl ?? 0));
      balanceHistory.push(balance);
      trades.push(closedTrade);
    }

    const metrics = this.metrics.calculate(input.initialBalance, balanceHistory, trades);
    return { trades, metrics };
  }

  private closeTriggeredTrades(
    openTrades: OpenTrade[],
    candle: MarketCandleEntity,
    balance: number,
  ) {
    const closedTrades: CreateBacktestTradeData[] = [];
    for (let index = openTrades.length - 1; index >= 0; index -= 1) {
      const trade = openTrades[index];
      if (trade.openedAt.getTime() >= candle.timestamp.getTime()) {
        continue;
      }

      const exit = this.exitForCandle(trade, candle);
      if (!exit) {
        continue;
      }

      const pnl = this.calculatePnl(trade, exit.price);
      closedTrades.push({
        ...trade,
        closedAt: candle.timestamp,
        exitPrice: exit.price,
        pnl,
        pnlPercent: balance === 0 ? 0 : Number((pnl / balance).toFixed(8)),
        result: exit.result,
      });
      openTrades.splice(index, 1);
    }
    return closedTrades;
  }

  private exitForCandle(trade: OpenTrade, candle: MarketCandleEntity) {
    if (trade.direction === TradeDirection.BUY) {
      if (candle.low <= trade.stopLoss) {
        return { price: trade.stopLoss, result: BacktestTradeResult.LOSS };
      }
      if (candle.high >= trade.takeProfit) {
        return { price: trade.takeProfit, result: BacktestTradeResult.WIN };
      }
      return null;
    }

    if (candle.high >= trade.stopLoss) {
      return { price: trade.stopLoss, result: BacktestTradeResult.LOSS };
    }
    if (candle.low <= trade.takeProfit) {
      return { price: trade.takeProfit, result: BacktestTradeResult.WIN };
    }
    return null;
  }

  private calculatePnl(trade: OpenTrade, exitPrice: number): number {
    const priceDelta =
      trade.direction === TradeDirection.BUY
        ? exitPrice - trade.entryPrice
        : trade.entryPrice - exitPrice;
    return this.roundMoney(priceDelta * trade.positionSize);
  }

  private closeRemainingTrades(
    openTrades: OpenTrade[],
    lastCandle: MarketCandleEntity,
    balance: number,
  ) {
    const closedTrades: CreateBacktestTradeData[] = [];
    for (const trade of openTrades) {
      const pnl = this.calculatePnl(trade, lastCandle.close);
      closedTrades.push({
        ...trade,
        closedAt: lastCandle.timestamp,
        exitPrice: lastCandle.close,
        pnl,
        pnlPercent: balance === 0 ? 0 : Number((pnl / balance).toFixed(8)),
        result:
          pnl > 0
            ? BacktestTradeResult.WIN
            : pnl < 0
              ? BacktestTradeResult.LOSS
              : BacktestTradeResult.BREAKEVEN,
      });
    }
    openTrades.splice(0, openTrades.length);
    return closedTrades;
  }

  private syntheticTechnicalAnalysis(
    instrumentId: string,
    candle: MarketCandleEntity,
    candles: MarketCandleEntity[],
  ): AgentDecisionEntity {
    return new AgentDecisionEntity(
      `backtest-analysis:${candle.id}`,
      AgentType.TECHNICAL,
      instrumentId,
      null,
      AgentDecisionAction.APPROVE,
      AgentExecutionSource.MANUAL,
      100,
      'Synthetic technical analysis for deterministic backtesting.',
      { indicators: this.indicators.calculate(candles) },
      candle.timestamp,
    );
  }

  private roundMoney(value: number): number {
    return Number(value.toFixed(8));
  }
}
