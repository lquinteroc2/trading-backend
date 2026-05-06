import { Module } from '@nestjs/common';
import { LogsService } from './application/logs.service';
import { LogsController } from './presentation/logs.controller';

@Module({
  controllers: [LogsController],
  providers: [LogsService],
  exports: [LogsService],
})
export class LogsModule {}
