import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '@/modules/auth/presentation/guards/jwt-auth.guard';
import { RolesGuard } from '@/modules/auth/presentation/guards/roles.guard';
import { Roles } from '@/modules/auth/presentation/decorators/roles.decorator';
import { BrokerService } from '../application/broker.service';
import { BrokerOrderDto, DryRunFromSignalDto } from './dto/broker-order.dto';

@ApiTags('broker')
@Controller('broker/mt5')
export class BrokerController {
  constructor(private readonly brokerService: BrokerService) {}

  @Get('health')
  health() {
    return this.brokerService.health();
  }

  @Get('account')
  getAccountInfo() {
    return this.brokerService.getAccountInfo();
  }

  @Get('symbols')
  getSymbols() {
    return this.brokerService.getSymbols();
  }

  @Get('prices/:symbol')
  getPrice(@Param('symbol') symbol: string) {
    return this.brokerService.getPrice(symbol);
  }

  @Post('orders/dry-run')
  dryRunOrder(@Body() dto: BrokerOrderDto) {
    return this.brokerService.dryRunOrder(dto);
  }

  @Post('orders/dry-run/from-signal')
  dryRunOrderFromSignal(@Body() dto: DryRunFromSignalDto) {
    return this.brokerService.dryRunOrderFromSignal(dto.signalId);
  }

  @Post('orders/place')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  placeOrder(@Body() dto: BrokerOrderDto) {
    return this.brokerService.placeOrder(dto);
  }
}
