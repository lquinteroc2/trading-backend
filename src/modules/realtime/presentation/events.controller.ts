import { Controller, Header, MessageEvent, Sse, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Observable } from 'rxjs';
import { JwtAuthGuard } from '@/modules/auth/presentation/guards/jwt-auth.guard';
import { RealtimeEventsService } from '../application/realtime-events.service';

@ApiTags('realtime')
@ApiBearerAuth()
@Controller('events')
export class EventsController {
  constructor(private readonly realtimeEvents: RealtimeEventsService) {}

  @Sse()
  @UseGuards(JwtAuthGuard)
  @Header('Content-Type', 'text/event-stream')
  @Header('Cache-Control', 'no-cache')
  @Header('Connection', 'keep-alive')
  stream(): Observable<MessageEvent> {
    return this.realtimeEvents.stream();
  }
}
