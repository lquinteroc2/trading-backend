import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './modules/auth/auth.module';
import { InstrumentsModule } from './modules/instruments/instruments.module';
import { MarketDataModule } from './modules/market-data/market-data.module';
import { SignalsModule } from './modules/signals/signals.module';
import { AgentsModule } from './modules/agents/agents.module';
import { RiskModule } from './modules/risk/risk.module';
import { PaperTradingModule } from './modules/paper-trading/paper-trading.module';
import { DatabaseModule } from './database/database.module';
import { HealthModule } from './health/health.module';
import { QueuesModule } from './queues/queues.module';
import configuration from './config/configuration';
import { validateConfig } from './config/env.validation';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validate: validateConfig,
    }),
    DatabaseModule,
    QueuesModule,
    HealthModule,
    AuthModule,
    InstrumentsModule,
    MarketDataModule,
    SignalsModule,
    AgentsModule,
    RiskModule,
    PaperTradingModule,
  ],
})
export class AppModule {}
