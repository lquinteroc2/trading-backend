import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Roles } from '@/modules/auth/presentation/decorators/roles.decorator';
import { InstrumentsService } from '../application/instruments.service';
import { CreateInstrumentDto } from './dto/create-instrument.dto';
import { UpdateInstrumentDto } from './dto/update-instrument.dto';

@ApiTags('instruments')
@Controller('instruments')
export class InstrumentsController {
  constructor(private readonly instrumentsService: InstrumentsService) {}

  @Post()
  @Roles(Role.ADMIN, Role.TRADER)
  create(@Body() dto: CreateInstrumentDto) {
    return this.instrumentsService.create(dto);
  }

  @Get()
  @Roles(Role.ADMIN, Role.TRADER, Role.VIEWER)
  findAll() {
    return this.instrumentsService.findAll();
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.TRADER, Role.VIEWER)
  findOne(@Param('id') id: string) {
    return this.instrumentsService.findById(id);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.TRADER)
  update(@Param('id') id: string, @Body() dto: UpdateInstrumentDto) {
    return this.instrumentsService.update(id, dto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  deactivate(@Param('id') id: string) {
    return this.instrumentsService.deactivate(id);
  }
}
