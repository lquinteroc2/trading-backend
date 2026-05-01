# Trading Backend

Backend privado para una plataforma de trading inteligente. El Sprint 1 deja lista la base para instrumentos, velas OHLCV, señales, decisiones de agentes, riesgo, paper trading, colas y futura automatizacion.

## Stack

- NestJS + TypeScript
- PostgreSQL + Prisma ORM
- Redis + BullMQ
- Docker Compose
- Swagger/OpenAPI
- Jest
- Arquitectura hexagonal por modulo: `domain`, `application`, `infrastructure`, `presentation`

## Requisitos

- Node.js 22+
- Docker y Docker Compose

## Variables de entorno

```bash
cp .env.example .env
```

Credenciales iniciales del seed:

- Email: `admin@trading.local`
- Password: `ChangeMe123!`

Puedes cambiarlas con `ADMIN_EMAIL` y `ADMIN_PASSWORD`.

Variables de ingesta historica de Sprint 2:

```env
BINANCE_API_BASE_URL=https://api.binance.com
MARKET_DATA_DEFAULT_PROVIDER=BINANCE
MARKET_DATA_SYNC_DEFAULT_LIMIT=1000
MARKET_DATA_SYNC_MAX_LIMIT=1000
```

Variables de analisis tecnico de Sprint 3:

```env
TECHNICAL_AGENT_BASE_URL=http://localhost:8000
TECHNICAL_ANALYSIS_MIN_CANDLES=200
TECHNICAL_ANALYSIS_DEFAULT_LIMIT=500
TECHNICAL_ANALYSIS_CANDLES_LIMIT=500
TECHNICAL_ANALYSIS_TIMEOUT_MS=8000
TECHNICAL_ANALYSIS_QUEUE_CONCURRENCY=5
TECHNICAL_ANALYSIS_QUEUE_DEBOUNCE_MS=30000
```

## Ejecutar con Docker Compose

```bash
docker compose up --build
```

La API queda disponible en:

- API: `http://localhost:3000/api/v1`
- Swagger: `http://localhost:3000/api/docs`
- Health: `http://localhost:3000/api/v1/health`
- Worker tecnico: `http://localhost:8000/health`

Para cargar seed dentro del contenedor:

```bash
docker compose exec backend npm run prisma:seed
```

## Ejecutar en local

```bash
npm install
cp .env.example .env
docker compose up -d postgres redis
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
npm run start:dev
```

Si ejecutas local fuera de Docker, usa en `.env`:

```env
DATABASE_URL=postgresql://trading:trading@localhost:5432/trading?schema=public
REDIS_HOST=localhost
```

## Migraciones

Crear/aplicar migracion en desarrollo:

```bash
npm run prisma:migrate
```

Aplicar migraciones en entornos tipo produccion:

```bash
npm run prisma:deploy
```

Regenerar cliente Prisma:

```bash
npm run prisma:generate
```

## Tests

```bash
npm test
```

Incluye pruebas unitarias para calculo de riesgo, servicio de instrumentos, servicio de señales,
provider Binance, sincronizacion historica, controller de sync e integracion de analisis tecnico.

Tests del worker Python:

```bash
cd services/agents
pytest
```

## Endpoints principales

Login:

```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@trading.local","password":"ChangeMe123!"}'
```

Crear instrumento:

```bash
curl -X POST http://localhost:3000/api/v1/instruments \
  -H "Content-Type: application/json" \
  -d '{"symbol":"XAUUSD","name":"Gold vs US Dollar","marketType":"COMMODITY","brokerSymbol":"XAUUSD"}'
```

Guardar vela:

```bash
curl -X POST http://localhost:3000/api/v1/market-data/candles \
  -H "Content-Type: application/json" \
  -d '{"instrumentId":"<instrument-id>","timeframe":"M5","open":2000,"high":2010,"low":1995,"close":2005,"volume":1000,"timestamp":"2026-04-30T22:00:00.000Z","source":"manual"}'
```

### Sprint 2: ingesta historica desde Binance

El modulo de market data ahora incluye una abstraccion de proveedores y una implementacion inicial
para Binance. El dominio trabaja con velas normalizadas internas; Binance queda como adaptador de
infraestructura.

Antes de sincronizar:

```bash
npm run prisma:migrate
npm run prisma:seed
```

Obtén el token:

```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@trading.local","password":"ChangeMe123!"}'
```

Obtén el `instrumentId` de BTCUSDT:

```bash
curl http://localhost:3000/api/v1/instruments \
  -H "Authorization: Bearer TOKEN"
```

Sincronizar 1.000 velas BTCUSDT M15 directamente:

```bash
curl -X POST http://localhost:3000/api/v1/market-data/sync \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "instrumentId": "ID_DEL_INSTRUMENTO_BTCUSDT",
    "timeframe": "M15",
    "startTime": "2024-01-01T00:00:00.000Z",
    "endTime": "2024-01-15T00:00:00.000Z",
    "limit": 1000,
    "provider": "BINANCE"
  }'
```

Encolar el mismo sync con BullMQ:

```bash
curl -X POST http://localhost:3000/api/v1/market-data/sync/enqueue \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "instrumentId": "ID_DEL_INSTRUMENTO_BTCUSDT",
    "timeframe": "M15",
    "startTime": "2024-01-01T00:00:00.000Z",
    "limit": 1000,
    "provider": "BINANCE"
  }'
```

Para que un sync manual dispare un unico analisis tecnico al terminar, agrega
`"triggerAnalysis": true`. Sin ese flag, los syncs masivos no encolan analisis para evitar cientos
de jobs redundantes.

Consultar velas guardadas:

```bash
curl "http://localhost:3000/api/v1/market-data/candles?instrumentId=ID_DEL_INSTRUMENTO_BTCUSDT&timeframe=M15&from=2024-01-01T00:00:00.000Z&to=2024-01-15T00:00:00.000Z&limit=1000&order=asc" \
  -H "Authorization: Bearer TOKEN"
```

Consultar auditoria de syncs:

```bash
curl "http://localhost:3000/api/v1/market-data/sync-jobs?provider=BINANCE&instrumentId=ID_DEL_INSTRUMENTO_BTCUSDT&timeframe=M15" \
  -H "Authorization: Bearer TOKEN"

curl http://localhost:3000/api/v1/market-data/sync-jobs/SYNC_JOB_ID \
  -H "Authorization: Bearer TOKEN"
```

Para verificar duplicados, ejecuta dos veces el mismo `POST /market-data/sync`. La segunda respuesta
debe reportar `insertedCount` menor que `fetchedCount` y `skippedDuplicates` mayor que cero. La base
tambien protege esto con el constraint unico `instrumentId + timeframe + timestamp`.

### Sprint 3: worker Python de analisis tecnico

El worker FastAPI vive en `services/agents` y calcula EMA20, EMA50, EMA200, RSI14 y ATR14 sin
generar señales ni ejecutar trades.

Instalar y correr el worker local:

```bash
cd services/agents
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

Probar health:

```bash
curl http://localhost:8000/health
```

Con Docker Compose, el servicio `technical-agent-worker` se levanta junto a backend, PostgreSQL y
Redis:

```bash
docker compose up --build
```

Analizar BTCUSDT desde el backend con velas guardadas en Sprint 2:

```bash
curl -X POST http://localhost:3000/api/v1/agents/technical/analyze \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "instrumentId": "ID_DEL_INSTRUMENTO_BTCUSDT",
    "timeframe": "M15",
    "limit": 1000
  }'
```

Encolar el mismo analisis con BullMQ:

```bash
curl -X POST http://localhost:3000/api/v1/agents/technical/analyze/enqueue \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "instrumentId": "ID_DEL_INSTRUMENTO_BTCUSDT",
    "timeframe": "M15",
    "limit": 1000
  }'
```

### Sprint 4: analisis tecnico automatico por eventos y colas

El flujo automatico queda asi:

```text
MarketCandle creada -> CANDLE_CLOSED -> technical-analysis-queue
-> TechnicalAnalysisProcessor -> worker Python -> AgentDecision
```

El `POST /market-data/candles` emite `CANDLE_CLOSED` y encola
`technical-analysis.analyze` con debounce por `symbol + timeframe`. Los syncs historicos no disparan
analisis salvo que envies `triggerAnalysis=true`; en ese caso se encola un solo job para la ultima
vela sincronizada.

Encolar manualmente un analisis:

```bash
curl -X POST http://localhost:3000/api/v1/agents/technical/analyze/enqueue \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "instrumentId": "ID_DEL_INSTRUMENTO_BTCUSDT",
    "timeframe": "M15",
    "limit": 500
  }'
```

Ver estado de jobs:

```bash
curl http://localhost:3000/api/v1/queues/technical-analysis \
  -H "Authorization: Bearer TOKEN"
```

Simular una nueva vela y disparar el flujo automatico:

```bash
curl -X POST http://localhost:3000/api/v1/market-data/candles \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "instrumentId": "ID_DEL_INSTRUMENTO_BTCUSDT",
    "timeframe": "M15",
    "open": 42000,
    "high": 42100,
    "low": 41900,
    "close": 42050,
    "volume": 100,
    "timestamp": "2026-05-01T12:00:00.000Z",
    "source": "REALTIME"
  }'
```

Ver logs del processor:

```bash
docker compose logs -f backend | grep technical_analysis_job
```

Forzar retries: detén el worker Python o configura `TECHNICAL_AGENT_BASE_URL` a una URL invalida y
encola un analisis. Los errores HTTP/timeout se reintentan hasta 3 veces con backoff exponencial.
Para ver un fallo no reintentable, encola un instrumento/timeframe con menos de
`TECHNICAL_ANALYSIS_MIN_CANDLES`; el job queda fallido sin retry util.

Ver decisiones guardadas:

```bash
docker compose exec postgres psql -U trading -d trading \
  -c "select id, \"agentType\", \"executionSource\", decision, \"confidenceScore\", \"createdAt\" from \"AgentDecision\" order by \"createdAt\" desc limit 5;"
```

Consultar el ultimo analisis tecnico guardado:

```bash
curl "http://localhost:3000/api/v1/agents/technical/latest?instrumentId=ID_DEL_INSTRUMENTO_BTCUSDT&timeframe=M15" \
  -H "Authorization: Bearer TOKEN"
```

Verificar persistencia en PostgreSQL:

```bash
docker compose exec postgres psql -U trading -d trading \
  -c "select id, \"agentType\", decision, \"confidenceScore\", \"createdAt\" from \"AgentDecision\" where \"instrumentId\" = 'ID_DEL_INSTRUMENTO_BTCUSDT' order by \"createdAt\" desc limit 5;"
```

### Sprint 5: generacion de señales con EMA Trend Strategy

El flujo automatico queda asi:

```text
candle -> technical-analysis-queue -> AgentDecision TECHNICAL
-> signal-generation-queue -> StrategyEngine -> EMA_TREND_STRATEGY -> TradingSignal
```

La estrategia inicial es `EMA_TREND_STRATEGY` version `v1`. Genera `BUY` cuando
`EMA20 > EMA50 > EMA200` y `RSI14` esta entre `45` y `70`; genera `SELL` cuando
`EMA20 < EMA50 < EMA200` y `RSI14` esta entre `30` y `55`. Si las EMAs o RSI no
confirman, retorna `NO_SIGNAL` y no guarda señal.

Cada señal guarda:

- `strategyId`
- `timeframe`
- `direction`
- `entryPrice`
- `stopLoss`
- `takeProfit`
- `confidenceScore`
- `reason`
- `candleTimestamp`

Generar una señal manual desde el ultimo analisis tecnico:

```bash
curl -X POST http://localhost:3000/api/v1/signals/generate \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "instrumentId": "ID_DEL_INSTRUMENTO_BTCUSDT",
    "timeframe": "M15"
  }'
```

Consultar señales:

```bash
curl "http://localhost:3000/api/v1/signals?instrumentId=ID_DEL_INSTRUMENTO_BTCUSDT&timeframe=M15&status=CREATED" \
  -H "Authorization: Bearer TOKEN"
```

Consultar una señal puntual:

```bash
curl http://localhost:3000/api/v1/signals/SIGNAL_ID \
  -H "Authorization: Bearer TOKEN"
```

Ver jobs de generacion:

```bash
curl http://localhost:3000/api/v1/queues/signal-generation \
  -H "Authorization: Bearer TOKEN"
```

Evitar duplicados:

La base de datos tiene una restriccion unica por
`instrumentId + timeframe + candleTimestamp`. Antes de ejecutar la estrategia, el servicio busca si ya
existe una señal para esa vela; si existe, responde `SKIPPED_DUPLICATE`.

Ajustar parametros operativos:

```env
SIGNAL_MIN_CONFIDENCE=50
SIGNAL_ATR_SL_MULTIPLIER=1.5
SIGNAL_ATR_TP_MULTIPLIER=3
SIGNAL_GENERATION_QUEUE_CONCURRENCY=5
PAPER_TRADING_DEFAULT_BALANCE=10000
PAPER_TRADING_MAX_OPEN_TRADES_PER_SYMBOL=1
PAPER_TRADING_ENABLED=true
PAPER_TRADING_QUEUE_CONCURRENCY=5
```

Los parametros versionados de estrategia viven en `StrategyVersion.parameters`; para `v1` incluyen
rangos RSI, limite de ATR estable y numero de velas usadas para confirmar consistencia de tendencia.

Ejemplo completo BTCUSDT:

```bash
# 1. Sincroniza velas con triggerAnalysis=true para disparar analisis y señal
curl -X POST http://localhost:3000/api/v1/market-data/sync \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "instrumentId": "ID_DEL_INSTRUMENTO_BTCUSDT",
    "timeframe": "M15",
    "startTime": "2026-04-25T00:00:00.000Z",
    "limit": 500,
    "triggerAnalysis": true
  }'

# 2. Revisa el ultimo analisis tecnico
curl "http://localhost:3000/api/v1/agents/technical/latest?instrumentId=ID_DEL_INSTRUMENTO_BTCUSDT&timeframe=M15" \
  -H "Authorization: Bearer TOKEN"

# 3. Revisa la señal creada
curl "http://localhost:3000/api/v1/signals?instrumentId=ID_DEL_INSTRUMENTO_BTCUSDT&timeframe=M15" \
  -H "Authorization: Bearer TOKEN"
```

Calcular riesgo:

```bash
curl -X POST http://localhost:3000/api/v1/risk/calculate-position-size \
  -H "Content-Type: application/json" \
  -d '{"accountBalance":10000,"riskPercent":1,"entryPrice":2000,"stopLoss":1990,"takeProfit":2020,"instrumentId":"<instrument-id>"}'
```

### Sprint 8: Paper Trading Engine

El flujo automatico queda asi:

```text
TradingSignal -> Risk Agent APPROVE -> paper-trading-queue
-> PaperTradingEngine -> PaperTrade OPEN
-> CANDLE_CLOSED -> evaluate-open-trades -> cierre por SL/TP -> balance actualizado
```

El seed crea una cuenta `DEFAULT_PAPER_ACCOUNT` con balance inicial `10000` USD. Tambien puedes crear
cuentas manualmente:

```bash
curl -X POST http://localhost:3000/api/v1/paper-trading/accounts \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"MY_PAPER_ACCOUNT","initialBalance":10000,"currency":"USD"}'
```

Consultar balance y cuentas:

```bash
curl http://localhost:3000/api/v1/paper-trading/accounts \
  -H "Authorization: Bearer TOKEN"

curl http://localhost:3000/api/v1/paper-trading/accounts/ACCOUNT_ID \
  -H "Authorization: Bearer TOKEN"
```

Abrir un trade simulado desde una señal aprobada por riesgo:

```bash
curl -X POST http://localhost:3000/api/v1/paper-trading/trades/open \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"signalId":"SIGNAL_ID","accountId":"ACCOUNT_ID"}'
```

Si omites `accountId`, el motor usa la primera cuenta paper activa. La apertura exige señal
`APPROVED` o `UNDER_REVIEW`, `AgentDecision` de tipo `RISK` con `APPROVE`, SL/TP validos, position
size del assessment/metadata de riesgo, y que no exista un trade abierto del mismo instrumento ni un
trade duplicado para el mismo `signalId`.

Evaluar trades abiertos con una vela:

```bash
curl -X POST http://localhost:3000/api/v1/paper-trading/evaluate-candle \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"candleId":"CANDLE_ID"}'
```

El cierre por vela es conservador: si SL y TP ocurren en la misma vela, se toma primero el stop loss.
Para BUY se cierra en SL cuando `low <= stopLoss` y en TP cuando `high >= takeProfit`; para SELL se
cierra en SL cuando `high >= stopLoss` y en TP cuando `low <= takeProfit`.

Cerrar manualmente:

```bash
curl -X PATCH http://localhost:3000/api/v1/paper-trading/trades/TRADE_ID/close \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"closePrice":65000,"closeReason":"MANUAL"}'
```

Consultar trades abiertos/cerrados:

```bash
curl "http://localhost:3000/api/v1/paper-trading/trades?accountId=ACCOUNT_ID&status=OPEN" \
  -H "Authorization: Bearer TOKEN"

curl "http://localhost:3000/api/v1/paper-trading/trades?instrumentId=INSTRUMENT_ID&result=WIN" \
  -H "Authorization: Bearer TOKEN"
```

El PnL se calcula como `(closePrice - entryPrice) * positionSize` en BUY y
`(entryPrice - closePrice) * positionSize` en SELL. Al cerrar, el balance de la cuenta se actualiza
con `balance + pnl` y se registra auditoria estructurada en logs (`paper_trade_opened` y
`paper_trade_closed`).

## Estructura

```text
src/
  app.module.ts
  main.ts
  common/
  config/
  database/
  health/
  queues/
  shared/
  modules/
    auth/
    instruments/
    market-data/
    signals/
    strategies/
    agents/
    risk/
    paper-trading/
```

Cada modulo de negocio separa:

- `domain`: entidades, puertos/repositorios e interfaces.
- `application`: casos de uso y servicios de aplicacion.
- `infrastructure`: adaptadores concretos, por ahora Prisma.
- `presentation`: controllers y DTOs HTTP.

## Listo para Sprint 9

- Agregar supervisor final que coordine technical/risk/paper trading.
- Definir politicas de portfolio sobre multiples instrumentos y cuentas.
- Exponer metricas agregadas de cuenta/trades para dashboard.
- Preparar integracion sandbox con broker sin tocar ejecucion real todavia.
