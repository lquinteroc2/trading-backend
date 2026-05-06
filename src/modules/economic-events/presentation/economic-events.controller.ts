import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { EconomicEventsService } from '../application/economic-events.service';
import { CreateEconomicEventDto } from './dto/create-economic-event.dto';
import { FindEconomicEventsDto } from './dto/find-economic-events.dto';
import { UpdateEconomicEventDto } from './dto/update-economic-event.dto';

@ApiTags('economic-events')
@Controller('economic-events')
export class EconomicEventsController {
  constructor(private readonly economicEvents: EconomicEventsService) {}

  @Get()
  findMany(@Query() query: FindEconomicEventsDto) {
    return this.economicEvents.findMany(query);
  }

  @Post()
  create(@Body() dto: CreateEconomicEventDto) {
    return this.economicEvents.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateEconomicEventDto) {
    return this.economicEvents.update(id, dto);
  }

  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.economicEvents.delete(id);
  }
}
