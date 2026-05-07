import { Body, Controller, Get, Patch } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Roles } from '@/modules/auth/presentation/decorators/roles.decorator';
import { SystemConfigService } from '../application/system-config.service';
import { UpdateSystemConfigDto } from './dto/update-system-config.dto';

@ApiTags('system')
@Controller('system/config')
export class SystemConfigController {
  constructor(private readonly systemConfig: SystemConfigService) {}

  @Get()
  @Roles(Role.ADMIN, Role.TRADER, Role.VIEWER)
  getConfig() {
    return this.systemConfig.getConfig();
  }

  @Patch()
  @Roles(Role.ADMIN)
  updateConfig(@Body() dto: UpdateSystemConfigDto) {
    return this.systemConfig.updateConfig(dto);
  }
}
