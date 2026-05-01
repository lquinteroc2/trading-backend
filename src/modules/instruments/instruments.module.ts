import { Module } from '@nestjs/common';
import { TOKENS } from '@/shared/tokens';
import { InstrumentsService } from './application/instruments.service';
import { PrismaInstrumentsRepository } from './infrastructure/prisma-instruments.repository';
import { InstrumentsController } from './presentation/instruments.controller';

@Module({
  controllers: [InstrumentsController],
  providers: [
    InstrumentsService,
    { provide: TOKENS.INSTRUMENTS_REPOSITORY, useClass: PrismaInstrumentsRepository },
  ],
  exports: [InstrumentsService, TOKENS.INSTRUMENTS_REPOSITORY],
})
export class InstrumentsModule {}
