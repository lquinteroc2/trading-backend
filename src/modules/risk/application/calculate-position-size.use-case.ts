import { BadRequestException, Injectable } from '@nestjs/common';

export type CalculatePositionSizeInput = {
  accountBalance: number;
  riskPercent: number;
  entryPrice: number;
  stopLoss: number;
  instrumentId: string;
  takeProfit?: number;
};

export type CalculatePositionSizeOutput = {
  instrumentId: string;
  riskAmount: number;
  stopLossDistance: number;
  positionSize: number;
  estimatedLoss: number;
  riskRewardRatio: number | null;
};

@Injectable()
export class CalculatePositionSizeUseCase {
  execute(input: CalculatePositionSizeInput): CalculatePositionSizeOutput {
    if (input.accountBalance <= 0 || input.riskPercent <= 0) {
      throw new BadRequestException('Account balance and risk percent must be greater than zero');
    }

    const stopLossDistance = Math.abs(input.entryPrice - input.stopLoss);
    if (stopLossDistance === 0) {
      throw new BadRequestException('Stop loss distance must be greater than zero');
    }

    const riskAmount = input.accountBalance * (input.riskPercent / 100);
    const positionSize = riskAmount / stopLossDistance;
    const estimatedLoss = positionSize * stopLossDistance;
    const riskRewardRatio = input.takeProfit
      ? Math.abs(input.takeProfit - input.entryPrice) / stopLossDistance
      : null;

    return {
      instrumentId: input.instrumentId,
      riskAmount,
      stopLossDistance,
      positionSize,
      estimatedLoss,
      riskRewardRatio,
    };
  }
}
