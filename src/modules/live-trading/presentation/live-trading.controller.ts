import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '@/modules/auth/presentation/guards/jwt-auth.guard';
import { RolesGuard } from '@/modules/auth/presentation/guards/roles.guard';
import { Roles } from '@/modules/auth/presentation/decorators/roles.decorator';
import { JwtUser } from '@/modules/auth/presentation/types/jwt-user.type';
import { ExecuteLiveSignalDto, UpdateLiveTradingLimitsDto } from './dto/live-trading.dto';
import { LIVE_CONFIRMATION_TEXT, LiveTradingService } from '../application/live-trading.service';

type RequestWithUser = {
  user: JwtUser;
};

@ApiTags('live-trading')
@ApiBearerAuth()
@Controller('live-trading')
@UseGuards(JwtAuthGuard, RolesGuard)
export class LiveTradingController {
  constructor(private readonly liveTrading: LiveTradingService) {}

  @Post('signals/:signalId/execute')
  @Roles(Role.ADMIN)
  async executeSignal(
    @Param('signalId') signalId: string,
    @Body() dto: ExecuteLiveSignalDto,
    @Req() request: RequestWithUser,
  ) {
    if (dto.confirmationText !== LIVE_CONFIRMATION_TEXT) {
      await this.liveTrading.recordBlockedExecution(
        signalId,
        request.user.sub,
        'confirmationText does not match required live execution confirmation',
        { manualDecisionId: dto.manualDecisionId },
      );
      throw new BadRequestException(
        'confirmationText does not match required live execution confirmation',
      );
    }
    return this.liveTrading.executeLiveFromSignal(
      signalId,
      request.user.sub,
      dto.manualDecisionId,
    );
  }

  @Get('trades')
  @Roles(Role.ADMIN, Role.TRADER, Role.VIEWER)
  findTrades() {
    return this.liveTrading.findTrades();
  }

  @Get('trades/:id')
  @Roles(Role.ADMIN, Role.TRADER, Role.VIEWER)
  findTradeById(@Param('id') id: string) {
    return this.liveTrading.findTradeById(id);
  }

  @Get('logs')
  @Roles(Role.ADMIN, Role.TRADER, Role.VIEWER)
  findLogs() {
    return this.liveTrading.findLogs();
  }

  @Get('limits')
  @Roles(Role.ADMIN, Role.TRADER, Role.VIEWER)
  getLimits() {
    return this.liveTrading.getLimits();
  }

  @Patch('limits')
  @Roles(Role.ADMIN)
  updateLimits(@Body() dto: UpdateLiveTradingLimitsDto) {
    return this.liveTrading.updateLimits(dto);
  }
}
