import { Module } from '@nestjs/common';
import { PrismaRiskProfilesRepository } from '@/modules/risk/infrastructure/prisma-risk-profiles.repository';
import { TOKENS } from '@/shared/tokens';
import { RiskProfileDashboardService } from './application/risk-profile-dashboard.service';
import { RiskProfileController } from './presentation/risk-profile.controller';

@Module({
  controllers: [RiskProfileController],
  providers: [
    RiskProfileDashboardService,
    { provide: TOKENS.RISK_PROFILES_REPOSITORY, useClass: PrismaRiskProfilesRepository },
  ],
})
export class RiskProfileModule {}
