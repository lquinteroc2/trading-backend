import { BadRequestException } from '@nestjs/common';
import { CalculatePositionSizeUseCase } from '@/modules/risk/application/calculate-position-size.use-case';

describe('CalculatePositionSizeUseCase', () => {
  const useCase = new CalculatePositionSizeUseCase();

  it('calculates position size and risk metrics', () => {
    const result = useCase.execute({
      accountBalance: 10000,
      riskPercent: 1,
      entryPrice: 2000,
      stopLoss: 1990,
      takeProfit: 2020,
      instrumentId: 'xauusd-id',
    });

    expect(result.riskAmount).toBe(100);
    expect(result.stopLossDistance).toBe(10);
    expect(result.positionSize).toBe(10);
    expect(result.estimatedLoss).toBe(100);
    expect(result.riskRewardRatio).toBe(2);
  });

  it('rejects zero stop loss distance', () => {
    expect(() =>
      useCase.execute({
        accountBalance: 10000,
        riskPercent: 1,
        entryPrice: 2000,
        stopLoss: 2000,
        instrumentId: 'xauusd-id',
      }),
    ).toThrow(BadRequestException);
  });
});
