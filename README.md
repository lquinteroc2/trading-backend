# Trading Backend

Backend privado para una plataforma de trading asistido: ingesta de mercado, agentes tecnicos y
fundamentales, generacion de senales, riesgo, supervisor, paper trading, assisted trading,
LIVE_LIMITED con MT5, analytics y eventos realtime.

## Stack

- NestJS 10 + TypeScript
- PostgreSQL + Prisma
- Redis + BullMQ
- FastAPI workers en `services/agents` y `services/mt5-worker`
- Swagger/OpenAPI
- Jest para backend Node
- Pytest para workers Python
- Arquitectura por modulo: `domain`, `application`, `infrastructure`, `presentation`

## Requisitos

- Node.js 22+
- Docker y Docker Compose
- Python 3.11+ para correr los workers fuera de Docker

## Arranque Rapido

```bash
npm install
cp .env.example .env
docker compose up -d postgres redis
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
npm run start:dev
```

URLs principales:

- API: `http://localhost:3000/api/v1`
- Swagger: `http://localhost:3000/api/docs`
- Health backend: `http://localhost:3000/api/v1/health`
- Technical worker: `http://localhost:8000/health`
- MT5 worker: `http://localhost:8010/health`

Con Docker Compose:

```bash
docker compose up --build
docker compose exec backend npm run prisma:seed
```

## Seguridad

La API es privada por defecto. Todas las rutas requieren JWT salvo rutas marcadas como publicas
internamente, por ejemplo `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout` y
`GET /health`.

Roles soportados:

- `ADMIN`: configuracion, limites, ejecucion live, operaciones administrativas.
- `TRADER`: operacion asistida, paper trading, agentes, backtesting y consultas.
- `VIEWER`: consultas de solo lectura.

Login:

```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@trading.local","password":"ChangeMe123!"}'
```

El login devuelve `accessToken` y tambien setea cookies HTTP-only para integracion con frontend.

## Variables Principales

Minimas:

```env
DATABASE_URL=postgresql://trading:trading@localhost:5432/trading?schema=public
JWT_SECRET=change-me
JWT_REFRESH_SECRET=change-me-too
CORS_ORIGINS=http://localhost:3001
REDIS_HOST=localhost
REDIS_PORT=6379
```

Market data y agentes:

```env
BINANCE_API_BASE_URL=https://api.binance.com
MARKET_DATA_DEFAULT_PROVIDER=BINANCE
MARKET_DATA_SYNC_DEFAULT_LIMIT=1000
MARKET_DATA_SYNC_MAX_LIMIT=1000
TECHNICAL_AGENT_BASE_URL=http://localhost:8000
TECHNICAL_ANALYSIS_MIN_CANDLES=200
TECHNICAL_ANALYSIS_DEFAULT_LIMIT=500
TECHNICAL_ANALYSIS_TIMEOUT_MS=8000
TECHNICAL_ANALYSIS_QUEUE_CONCURRENCY=5
TECHNICAL_ANALYSIS_QUEUE_DEBOUNCE_MS=30000
```

Senales, supervisor y paper trading:

```env
SIGNAL_MIN_CONFIDENCE=50
SIGNAL_ATR_SL_MULTIPLIER=1.5
SIGNAL_ATR_TP_MULTIPLIER=3
SIGNAL_BLOCK_RANGING_MARKET=true
SIGNAL_BLOCK_MTF_CONFLICT=true
SUPERVISOR_MIN_CONFIDENCE=70
SUPERVISOR_MAX_OPEN_TRADES=1
SUPERVISOR_MAX_DRAWDOWN=0.02
PAPER_TRADING_ENABLED=true
PAPER_TRADING_DEFAULT_BALANCE=10000
PAPER_TRADING_MAX_OPEN_TRADES_PER_SYMBOL=1
```

Broker MT5 y live limited:

```env
ENABLE_LIVE_TRADING=false
BROKER_PROVIDER=MT5
MT5_WORKER_BASE_URL=http://localhost:8010
MT5_DRY_RUN=true
MT5_REQUEST_TIMEOUT_MS=10000
```

## Modulos

- `auth`: login, refresh tokens, cookies, JWT y roles.
- `instruments`: instrumentos negociables y simbolos de broker.
- `market-data`: velas OHLCV, sync historico y auditoria de syncs.
- `agents`: analisis tecnico via worker Python y decisiones de agentes.
- `fundamental`: evaluacion fundamental basada en eventos economicos.
- `signals` / `strategies`: EMA trend strategy y generacion de senales.
- `risk`: sizing y evaluaciones de riesgo.
- `supervisor`: decision final `OPERATE`, `WAIT` o `BLOCK`.
- `paper-trading`: motor de cuentas y trades simulados.
- `assisted-trading`: aprobacion/rechazo manual.
- `broker`: conector MT5, dry-runs y auditoria.
- `live-trading`: ejecucion real limitada con multiples compuertas.
- `analytics`: metricas, agrupaciones, equity curve y CSV.
- `realtime`: eventos server-sent events para frontend.
- `queues`: BullMQ para analisis, senales, riesgo, supervisor, broker y paper trading.

## Flujos Principales

Analisis y senales:

```text
MarketCandle -> CANDLE_CLOSED -> technical-analysis-queue
-> TechnicalAnalysisProcessor -> services/agents -> AgentDecision TECHNICAL
-> signal-generation-queue -> TradingSignal
```

Riesgo, supervisor y paper trading:

```text
TradingSignal -> RiskAssessment -> SupervisorDecision
-> PAPER_TRADING: PaperTrade OPEN automatico si OPERATE
-> ASSISTED_TRADING: PENDING_MANUAL_APPROVAL
```

Assisted y MT5 dry-run:

```text
PENDING_MANUAL_APPROVAL -> ManualTradingDecision APPROVE
-> PAPER_TRADING | MT5_DRY_RUN | NONE
```

LIVE_LIMITED:

```text
Manual approval + ADMIN + confirmation text + ENABLE_LIVE_TRADING=true
+ MT5_DRY_RUN=false + SystemMode=LIVE_LIMITED + killSwitch=false
-> requested LiveTrade -> MT5 order -> EXECUTED/FAILED audit
```

La ejecucion live reserva un `LiveTrade.REQUESTED` antes de llamar al broker para reducir doble
ejecucion concurrente. Los intentos `FAILED` no bloquean un reintento posterior.

## Endpoints Frecuentes

Usa `Authorization: Bearer TOKEN` en todas las rutas privadas.

```bash
# Instrumentos
curl http://localhost:3000/api/v1/instruments -H "Authorization: Bearer TOKEN"

# Crear instrumento
curl -X POST http://localhost:3000/api/v1/instruments \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"symbol":"BTCUSDT","name":"Bitcoin / Tether","marketType":"CRYPTO","brokerSymbol":"BTCUSDT"}'

# Sincronizar velas
curl -X POST http://localhost:3000/api/v1/market-data/sync \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"instrumentId":"INSTRUMENT_ID","timeframe":"M15","startTime":"2024-01-01T00:00:00.000Z","limit":1000,"provider":"BINANCE","triggerAnalysis":true}'

# Consultar velas, con limite maximo 5000
curl "http://localhost:3000/api/v1/market-data/candles?instrumentId=INSTRUMENT_ID&timeframe=M15&limit=1000&order=asc" \
  -H "Authorization: Bearer TOKEN"

# Analisis tecnico manual
curl -X POST http://localhost:3000/api/v1/agents/technical/analyze \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"instrumentId":"INSTRUMENT_ID","primaryTimeframe":"M15","confirmationTimeframes":["H1","H4"],"limit":1000}'

# Generar senal manual
curl -X POST http://localhost:3000/api/v1/signals/generate \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"instrumentId":"INSTRUMENT_ID","timeframe":"M15"}'

# Evaluar riesgo
curl -X POST http://localhost:3000/api/v1/agents/risk/evaluate \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"signalId":"SIGNAL_ID"}'

# Decision supervisor
curl -X POST http://localhost:3000/api/v1/agents/supervisor/decide \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"signalId":"SIGNAL_ID"}'

# Paper trading
curl http://localhost:3000/api/v1/paper-trading/trades?limit=200 \
  -H "Authorization: Bearer TOKEN"

# Config del sistema
curl -X PATCH http://localhost:3000/api/v1/system/config \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"mode":"ASSISTED_TRADING","killSwitch":false}'

# MT5 dry-run desde una senal
curl -X POST http://localhost:3000/api/v1/broker/mt5/orders/dry-run/from-signal \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"signalId":"SIGNAL_ID"}'
```

## LIVE_LIMITED

Por defecto esta apagado. Para habilitarlo en demo/controlado:

```env
ENABLE_LIVE_TRADING=true
MT5_DRY_RUN=false
```

Luego cambiar modo:

```bash
curl -X PATCH http://localhost:3000/api/v1/system/config \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"mode":"LIVE_LIMITED","killSwitch":false}'
```

Configurar limites:

```bash
curl -X PATCH http://localhost:3000/api/v1/live-trading/limits \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"maxDailyLiveTrades":1,"maxDailyLoss":50,"maxVolumePerTrade":0.01,"allowedSymbols":["XAUUSD","BTCUSDT"],"isActive":true}'
```

Ejecutar:

```bash
curl -X POST http://localhost:3000/api/v1/live-trading/signals/SIGNAL_ID/execute \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"manualDecisionId":"MANUAL_DECISION_ID","confirmationText":"CONFIRMO EJECUCION REAL LIMITADA"}'
```

Nunca activar con dinero real sin validar primero en demo, revisar logs y confirmar limites. El kill
switch corta ejecucion:

```bash
curl -X PATCH http://localhost:3000/api/v1/system/config \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"killSwitch":true}'
```

## Workers Python

Technical agent:

```bash
cd services/agents
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
pytest
```

MT5 worker:

```bash
cd services/mt5-worker
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8010
pytest
```

El paquete oficial `MetaTrader5` normalmente requiere Windows/VPS con terminal MT5 disponible. En
macOS/Linux Docker el worker sirve para health, contratos y dry-run, pero no para conexion real al
terminal.

## Analytics

Endpoints principales:

```bash
curl "http://localhost:3000/api/v1/analytics/summary?executionType=PAPER_TRADING" \
  -H "Authorization: Bearer TOKEN"

curl "http://localhost:3000/api/v1/analytics/equity-curve?executionType=BACKTEST" \
  -H "Authorization: Bearer TOKEN"

curl "http://localhost:3000/api/v1/analytics/export.csv?type=trades&executionType=PAPER_TRADING" \
  -H "Authorization: Bearer TOKEN"
```

Filtros soportados: `executionType`, `instrumentId`, `symbol`, `strategyId`, `timeframe`, `from`,
`to`.

## Tests

```bash
npm run build
npm test
npm test -- --coverage --runInBand
```

Workers Python:

```bash
python3 -m pytest services/agents/app/tests services/mt5-worker/app/tests
```

## Migraciones y Prisma

```bash
npm run prisma:migrate
npm run prisma:deploy
npm run prisma:generate
npm run prisma:seed
```

## Estructura

```text
src/
  app.module.ts
  main.ts
  common/
  config/
  database/
  events/
  health/
  queues/
  modules/
    auth/
    instruments/
    market-data/
    agents/
    fundamental/
    signals/
    strategies/
    risk/
    supervisor/
    system/
    paper-trading/
    assisted-trading/
    broker/
    live-trading/
    analytics/
    realtime/
services/
  agents/
  mt5-worker/
prisma/
  schema.prisma
  migrations/
```
