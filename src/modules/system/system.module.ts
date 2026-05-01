import { Module } from '@nestjs/common';
import { SystemConfigService } from './application/system-config.service';
import { SystemConfigController } from './presentation/system-config.controller';

@Module({
  controllers: [SystemConfigController],
  providers: [SystemConfigService],
  exports: [SystemConfigService],
})
export class SystemModule {}
