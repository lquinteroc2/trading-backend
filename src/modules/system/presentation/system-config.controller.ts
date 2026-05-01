import { Body, Controller, Get, Patch } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { SystemConfigService } from '../application/system-config.service';
import { UpdateSystemConfigDto } from './dto/update-system-config.dto';

@ApiTags('system')
@Controller('system/config')
export class SystemConfigController {
  constructor(private readonly systemConfig: SystemConfigService) {}

  @Get()
  getConfig() {
    return this.systemConfig.getConfig();
  }

  @Patch()
  updateConfig(@Body() dto: UpdateSystemConfigDto) {
    return this.systemConfig.updateConfig(dto);
  }
}
