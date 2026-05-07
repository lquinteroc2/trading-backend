import { Body, Controller, Get, Patch } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Roles } from '@/modules/auth/presentation/decorators/roles.decorator';
import { RiskProfileDashboardService } from '../application/risk-profile-dashboard.service';
import { UpdateActiveRiskProfileDto } from './dto/update-active-risk-profile.dto';

@ApiTags('risk-profile')
@Controller('risk-profile')
export class RiskProfileController {
  constructor(private readonly riskProfile: RiskProfileDashboardService) {}

  @Get('active')
  @Roles(Role.ADMIN, Role.TRADER, Role.VIEWER)
  getActive() {
    return this.riskProfile.getActive();
  }

  @Patch('active')
  @Roles(Role.ADMIN)
  updateActive(@Body() dto: UpdateActiveRiskProfileDto) {
    return this.riskProfile.updateActive(dto);
  }
}
