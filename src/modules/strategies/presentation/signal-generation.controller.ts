import { Body, Controller, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Roles } from '@/modules/auth/presentation/decorators/roles.decorator';
import { SignalGenerationService } from '../application/signal-generation.service';
import { GenerateSignalDto } from '@/modules/signals/presentation/dto/generate-signal.dto';

@ApiTags('signals')
@Controller('signals')
export class SignalGenerationController {
  constructor(private readonly signalGeneration: SignalGenerationService) {}

  @Post('generate')
  @Roles(Role.ADMIN, Role.TRADER)
  generate(@Body() dto: GenerateSignalDto) {
    return this.signalGeneration.generate(dto);
  }
}
