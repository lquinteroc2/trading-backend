import { Body, Controller, Get, Patch } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { RiskProfileDashboardService } from '../application/risk-profile-dashboard.service';
import { UpdateActiveRiskProfileDto } from './dto/update-active-risk-profile.dto';

@ApiTags('risk-profile')
@Controller('risk-profile')
export class RiskProfileController {
  constructor(private readonly riskProfile: RiskProfileDashboardService) {}

  @Get('active')
  getActive() {
    return this.riskProfile.getActive();
  }

  @Patch('active')
  updateActive(@Body() dto: UpdateActiveRiskProfileDto) {
    return this.riskProfile.updateActive(dto);
  }
}
