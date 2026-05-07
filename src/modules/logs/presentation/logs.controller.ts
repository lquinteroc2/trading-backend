import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Roles } from '@/modules/auth/presentation/decorators/roles.decorator';
import { LogsService } from '../application/logs.service';

@ApiTags('logs')
@Controller('logs')
export class LogsController {
  constructor(private readonly logs: LogsService) {}

  @Get()
  @Roles(Role.ADMIN, Role.TRADER, Role.VIEWER)
  findMany() {
    return this.logs.findMany();
  }
}
