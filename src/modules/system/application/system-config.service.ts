import { Injectable } from '@nestjs/common';
import { SystemMode } from '@prisma/client';
import { PrismaService } from '@/database/prisma.service';

const SYSTEM_CONFIG_ID = 'global';

@Injectable()
export class SystemConfigService {
  constructor(private readonly prisma: PrismaService) {}

  getConfig() {
    return this.prisma.systemConfig.upsert({
      where: { id: SYSTEM_CONFIG_ID },
      update: {},
      create: {
        id: SYSTEM_CONFIG_ID,
        mode: SystemMode.PAPER_TRADING,
        killSwitch: false,
      },
    });
  }

  async updateConfig(data: { mode?: SystemMode; killSwitch?: boolean }) {
    await this.getConfig();
    return this.prisma.systemConfig.update({
      where: { id: SYSTEM_CONFIG_ID },
      data,
    });
  }
}
