import { Injectable } from '@nestjs/common';
import { SystemMode } from '@prisma/client';
import { PrismaService } from '@/database/prisma.service';
import { InternalEventBus } from '@/events/internal-event-bus.service';
import { TRADING_EVENTS } from '@/events/trading-events';

const SYSTEM_CONFIG_ID = 'global';

@Injectable()
export class SystemConfigService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventBus: InternalEventBus,
  ) {}

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
    const previous = await this.getConfig();
    const updated = await this.prisma.systemConfig.update({
      where: { id: SYSTEM_CONFIG_ID },
      data,
    });
    if (data.killSwitch !== undefined && data.killSwitch !== previous.killSwitch) {
      this.eventBus.emit(TRADING_EVENTS.KILL_SWITCH_CHANGED, {
        killSwitch: data.killSwitch,
        mode: updated.mode,
      });
    } else if (data.mode !== undefined && data.mode !== previous.mode) {
      this.eventBus.emit(TRADING_EVENTS.KILL_SWITCH_CHANGED, {
        killSwitch: updated.killSwitch,
        mode: updated.mode,
      });
    }
    return updated;
  }
}
