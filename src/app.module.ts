import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './modules/auth/auth.module';
import { InstrumentsModule } from './modules/instruments/instruments.module';
import { MarketDataModule } from './modules/market-data/market-data.module';
import { SignalsModule } from './modules/signals/signals.module';
import { AgentsModule } from './modules/agents/agents.module';
import { RiskModule } from './modules/risk/risk.module';
import { PaperTradingModule } from './modules/paper-trading/paper-trading.module';
import { StrategiesModule } from './modules/strategies/strategies.module';
import { BacktestingModule } from './modules/backtesting/backtesting.module';
import { SupervisorModule } from './modules/supervisor/supervisor.module';
import { SystemModule } from './modules/system/system.module';
import { DatabaseModule } from './database/database.module';
import { HealthModule } from './health/health.module';
import { QueuesModule } from './queues/queues.module';
import { InternalEventsModule } from './events/internal-events.module';
import configuration from './config/configuration';
import { validateConfig } from './config/env.validation';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validate: validateConfig,
    }),
    InternalEventsModule,
    DatabaseModule,
    QueuesModule,
    HealthModule,
    AuthModule,
    InstrumentsModule,
    MarketDataModule,
    SignalsModule,
    StrategiesModule,
    BacktestingModule,
    SystemModule,
    AgentsModule,
    RiskModule,
    SupervisorModule,
    PaperTradingModule,
  ],
})
export class AppModule {}
