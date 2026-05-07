import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Roles } from '@/modules/auth/presentation/decorators/roles.decorator';
import { EconomicEventsService } from '../application/economic-events.service';
import { CreateEconomicEventDto } from './dto/create-economic-event.dto';
import { FindEconomicEventsDto } from './dto/find-economic-events.dto';
import { UpdateEconomicEventDto } from './dto/update-economic-event.dto';

@ApiTags('economic-events')
@Controller('economic-events')
export class EconomicEventsController {
  constructor(private readonly economicEvents: EconomicEventsService) {}

  @Get()
  @Roles(Role.ADMIN, Role.TRADER, Role.VIEWER)
  findMany(@Query() query: FindEconomicEventsDto) {
    return this.economicEvents.findMany(query);
  }

  @Post()
  @Roles(Role.ADMIN, Role.TRADER)
  create(@Body() dto: CreateEconomicEventDto) {
    return this.economicEvents.create(dto);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.TRADER)
  update(@Param('id') id: string, @Body() dto: UpdateEconomicEventDto) {
    return this.economicEvents.update(id, dto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  delete(@Param('id') id: string) {
    return this.economicEvents.delete(id);
  }
}
