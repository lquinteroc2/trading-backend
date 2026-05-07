import { Module } from '@nestjs/common';
import { RealtimeEventsService } from './application/realtime-events.service';
import { EventsController } from './presentation/events.controller';

@Module({
  controllers: [EventsController],
  providers: [RealtimeEventsService],
})
export class RealtimeModule {}
