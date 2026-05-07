import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '@/modules/auth/presentation/decorators/public.decorator';

@ApiTags('health')
@Controller('health')
@Public()
export class HealthController {
  @Get()
  check() {
    return {
      status: 'ok',
      service: 'trading-backend',
      timestamp: new Date().toISOString(),
    };
  }
}
