import { Module } from '@nestjs/common';
import { EconomicEventsService } from './application/economic-events.service';
import { EconomicEventsController } from './presentation/economic-events.controller';

@Module({
  controllers: [EconomicEventsController],
  providers: [EconomicEventsService],
  exports: [EconomicEventsService],
})
export class EconomicEventsModule {}
