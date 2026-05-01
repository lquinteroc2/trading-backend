import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { SignalsService } from '../application/signals.service';
import { CreateSignalDto } from './dto/create-signal.dto';
import { FindSignalsDto } from './dto/find-signals.dto';
import { UpdateSignalStatusDto } from './dto/update-signal-status.dto';

@ApiTags('signals')
@Controller('signals')
export class SignalsController {
  constructor(private readonly signalsService: SignalsService) {}

  @Post()
  create(@Body() dto: CreateSignalDto) {
    return this.signalsService.create({
      ...dto,
      expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
    });
  }

  @Get()
  findMany(@Query() query: FindSignalsDto) {
    return this.signalsService.findMany({
      ...query,
      from: query.from ? new Date(query.from) : undefined,
      to: query.to ? new Date(query.to) : undefined,
    });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.signalsService.findById(id);
  }

  @Patch(':id/status')
  updateStatus(@Param('id') id: string, @Body() dto: UpdateSignalStatusDto) {
    return this.signalsService.updateStatus(id, dto.status);
  }
}
