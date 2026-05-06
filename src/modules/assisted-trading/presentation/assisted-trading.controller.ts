import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '@/modules/auth/presentation/guards/jwt-auth.guard';
import { RolesGuard } from '@/modules/auth/presentation/guards/roles.guard';
import { Roles } from '@/modules/auth/presentation/decorators/roles.decorator';
import { JwtUser } from '@/modules/auth/presentation/types/jwt-user.type';
import { AssistedTradingService } from '../application/assisted-trading.service';
import {
  ApproveAssistedSignalDto,
  FindPendingAssistedSignalsDto,
  RejectAssistedSignalDto,
} from './dto/assisted-trading.dto';

type RequestWithUser = {
  user: JwtUser;
  ip?: string;
  headers: Record<string, string | string[] | undefined>;
};

@ApiTags('assisted-trading')
@ApiBearerAuth()
@Controller('assisted-trading')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AssistedTradingController {
  constructor(private readonly assistedTrading: AssistedTradingService) {}

  @Post('signals/:signalId/approve')
  @Roles(Role.ADMIN, Role.TRADER)
  approveSignal(
    @Param('signalId') signalId: string,
    @Body() dto: ApproveAssistedSignalDto,
    @Req() request: RequestWithUser,
  ) {
    return this.assistedTrading.approveSignal(
      signalId,
      request.user.sub,
      dto.executionTarget,
      dto.reason,
      this.toAuditContext(request),
    );
  }

  @Post('signals/:signalId/reject')
  @Roles(Role.ADMIN, Role.TRADER)
  rejectSignal(
    @Param('signalId') signalId: string,
    @Body() dto: RejectAssistedSignalDto,
    @Req() request: RequestWithUser,
  ) {
    return this.assistedTrading.rejectSignal(
      signalId,
      request.user.sub,
      dto.reason,
      this.toAuditContext(request),
    );
  }

  @Get('pending-signals')
  @Roles(Role.ADMIN, Role.TRADER, Role.VIEWER)
  findPendingSignals(@Query() query: FindPendingAssistedSignalsDto) {
    return this.assistedTrading.findPendingSignals(query);
  }

  @Get('decisions')
  @Roles(Role.ADMIN, Role.TRADER, Role.VIEWER)
  findDecisions() {
    return this.assistedTrading.findDecisions();
  }

  @Get('decisions/:id')
  @Roles(Role.ADMIN, Role.TRADER, Role.VIEWER)
  findDecisionById(@Param('id') id: string) {
    return this.assistedTrading.findDecisionById(id);
  }

  private toAuditContext(request: RequestWithUser) {
    const forwardedFor = request.headers['x-forwarded-for'];
    const userAgent = request.headers['user-agent'];
    return {
      ipAddress: Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor ?? request.ip,
      userAgent: Array.isArray(userAgent) ? userAgent[0] : userAgent,
    };
  }
}
