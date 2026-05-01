import { Module } from '@nestjs/common';
import { CalculatePositionSizeUseCase } from './application/calculate-position-size.use-case';
import { RiskController } from './presentation/risk.controller';

@Module({
  controllers: [RiskController],
  providers: [CalculatePositionSizeUseCase],
  exports: [CalculatePositionSizeUseCase],
})
export class RiskModule {}
