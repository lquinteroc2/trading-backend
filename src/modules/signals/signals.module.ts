import { Module } from '@nestjs/common';
import { TOKENS } from '@/shared/tokens';
import { SignalsService } from './application/signals.service';
import { PrismaSignalsRepository } from './infrastructure/prisma-signals.repository';
import { SignalsController } from './presentation/signals.controller';

@Module({
  controllers: [SignalsController],
  providers: [
    SignalsService,
    { provide: TOKENS.SIGNALS_REPOSITORY, useClass: PrismaSignalsRepository },
  ],
  exports: [SignalsService, TOKENS.SIGNALS_REPOSITORY],
})
export class SignalsModule {}
