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

### Sprint 9: Supervisor Agent

El flujo automatico queda:

```text
signal -> risk evaluation -> supervisor decision -> paper trade
```

El Risk Agent ya no abre trades directamente. Cuando termina una evaluacion de riesgo emite
`RISK_EVALUATED`, se encola `supervisor.decide` en `supervisor-decision-queue`, el Supervisor registra
su decision en `SupervisorDecision` y tambien en `AgentDecision` con `agentType = SUPERVISOR`.
Solo si la decision final es `OPERATE`, se encola `paper-trade.open`.

Reglas principales del Supervisor:

- `OPERATE`: confianza >= `SUPERVISOR_MIN_CONFIDENCE`, riesgo aprobado, modo `PAPER_TRADING`, sin kill switch, sin trade abierto del mismo instrumento, `openTrades < SUPERVISOR_MAX_OPEN_TRADES` y drawdown diario bajo el limite.
- `WAIT`: senal valida con confianza media, por defecto entre 50 y 69.
- `BLOCK`: riesgo rechazado, confianza menor a 50, kill switch activo, modo `SAFE_MODE`/`PAUSED`, trade abierto del mismo instrumento o drawdown diario excedido.

Variables:

```env
SUPERVISOR_MIN_CONFIDENCE=70
SUPERVISOR_MAX_OPEN_TRADES=1
SUPERVISOR_MAX_DRAWDOWN=0.02
SUPERVISOR_DECISION_QUEUE_CONCURRENCY=5
```

Endpoints:

```bash
curl -X POST http://localhost:3000/api/v1/agents/supervisor/decide \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN" \
  -d '{"signalId":"SIGNAL_ID"}'

curl http://localhost:3000/api/v1/agents/supervisor/decisions \
  -H "Authorization: Bearer TOKEN"

curl http://localhost:3000/api/v1/agents/supervisor/decisions/SUPERVISOR_DECISION_ID \
  -H "Authorization: Bearer TOKEN"
```

Config global del sistema:

```bash
curl http://localhost:3000/api/v1/system/config \
  -H "Authorization: Bearer TOKEN"

curl -X PATCH http://localhost:3000/api/v1/system/config \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN" \
  -d '{"mode":"PAPER_TRADING","killSwitch":false}'
```

Para bloquear todo el sistema:

```bash
curl -X PATCH http://localhost:3000/api/v1/system/config \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN" \
  -d '{"killSwitch":true}'
```

Con `killSwitch = true` el Supervisor responde `BLOCK` para toda senal. Con `mode = SAFE_MODE` o
`mode = PAUSED` tampoco se abren trades.

Para probar el flujo completo:

1. Crear o sincronizar velas hasta disparar `SIGNAL_CREATED`.
2. Verificar que el Risk Agent cree un `RiskAssessment`.
3. Consultar `GET /agents/supervisor/decisions` y confirmar `OPERATE`, `WAIT` o `BLOCK`.
4. Si fue `OPERATE`, consultar `GET /paper-trading/trades?signalId=SIGNAL_ID`.

### Sprint 13: MT5 Broker Connector seguro

Sprint 13 agrega una integracion segura con MetaTrader 5 sin reemplazar paper trading y sin ejecutar
ordenes reales. El backend habla con un worker FastAPI en `services/mt5-worker`, persiste auditoria en
`BrokerConnectionLog` y registra simulaciones en `BrokerOrderSimulation`.

Variables principales:

```env
ENABLE_LIVE_TRADING=false
BROKER_PROVIDER=MT5
MT5_WORKER_BASE_URL=http://localhost:8010
MT5_LOGIN=
MT5_PASSWORD=
MT5_SERVER=
MT5_TERMINAL_PATH=
MT5_DRY_RUN=true
MT5_REQUEST_TIMEOUT_MS=10000
```

Ejecutar el worker local:

```bash
cd services/mt5-worker
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8010
```

Para una conexion real con terminal MT5 en un entorno compatible:

```bash
pip install MetaTrader5
```

Tambien existe el servicio `mt5-worker` en `docker-compose.yml`:

```bash
docker compose up mt5-worker
```

Limitacion importante: el paquete `MetaTrader5` requiere un terminal MT5 instalado y accesible por el
runtime. En macOS/Linux Docker normalmente no hay wheel compatible del paquete oficial, asi que el
contenedor queda para health, validacion de contratos y dry-run. Para cuenta/simbolos/precios reales,
usa Windows/VPS o un entorno donde `pip install MetaTrader5` funcione y el terminal MT5 este disponible.

Para cuenta demo: crear o abrir una cuenta demo desde el terminal MT5, confirmar que el terminal
queda autenticado, y exportar `MT5_LOGIN`, `MT5_PASSWORD`, `MT5_SERVER` y, si aplica,
`MT5_TERMINAL_PATH`. El backend nunca persiste ni retorna `MT5_PASSWORD`.

Pruebas directas contra el worker:

```bash
curl http://localhost:8010/health
curl http://localhost:8010/mt5/account
curl http://localhost:8010/mt5/symbols
curl http://localhost:8010/mt5/prices/XAUUSD
curl -X POST http://localhost:8010/mt5/orders/dry-run \
  -H "Content-Type: application/json" \
  -d '{"symbol":"XAUUSD","direction":"BUY","volume":0.01,"entryPrice":2320.35,"stopLoss":2315,"takeProfit":2330}'
```

Endpoints del backend:

```bash
curl http://localhost:3000/api/v1/broker/mt5/health
curl http://localhost:3000/api/v1/broker/mt5/account
curl http://localhost:3000/api/v1/broker/mt5/symbols
curl http://localhost:3000/api/v1/broker/mt5/prices/XAUUSD

curl -X POST http://localhost:3000/api/v1/broker/mt5/orders/dry-run \
  -H "Content-Type: application/json" \
  -d '{"symbol":"XAUUSD","direction":"BUY","volume":0.01,"entryPrice":2320.35,"stopLoss":2315,"takeProfit":2330}'

curl -X POST http://localhost:3000/api/v1/broker/mt5/orders/dry-run/from-signal \
  -H "Content-Type: application/json" \
  -d '{"signalId":"SIGNAL_ID"}'
```

`dry-run/from-signal` exige:

- `RiskAssessment.decision = APPROVED`.
- `SupervisorDecision.decision = OPERATE`.
- Senal `BUY` o `SELL` con `entryPrice`, `stopLoss` y `takeProfit`.

Verificar logs:

```bash
npx prisma studio
```

Revisar las tablas `BrokerConnectionLog` y `BrokerOrderSimulation`.

`POST /broker/mt5/orders/place` existe y esta protegido para `ADMIN`, pero Sprint 13 lo bloquea por
defecto. Si `ENABLE_LIVE_TRADING=false`, `MT5_DRY_RUN=true`, `killSwitch=true` o el modo del sistema no
es compatible, retorna bloqueo controlado y deja log. Incluso con flags permisivos, el backend mantiene
la ejecucion real deshabilitada en este sprint.

Pendiente de produccion MT5: ver [docs/mt5-production-pending.md](docs/mt5-production-pending.md).

### Sprint 14: Assisted Trading

`ASSISTED_TRADING` agrega una compuerta manual entre el Supervisor y la ejecucion. El sistema sigue
generando senales, Risk Agent evalua y Supervisor decide, pero cuando el modo global es
`ASSISTED_TRADING` una decision `OPERATE` deja la senal en `PENDING_MANUAL_APPROVAL` y no abre trades
automaticamente.

Diferencia principal:

- `PAPER_TRADING`: `SupervisorDecision.OPERATE` encola `paper-trade.open` automaticamente.
- `ASSISTED_TRADING`: `SupervisorDecision.OPERATE` exige aprobacion manual.
- `SAFE_MODE` / `PAUSED`: bloquean ejecucion.
- `killSwitch=true`: bloquea toda aprobacion.

Estados nuevos de senal:

```text
PENDING_MANUAL_APPROVAL
MANUALLY_APPROVED
MANUALLY_REJECTED
EXECUTED_PAPER
DRY_RUN_EXECUTED
```

Cambiar modo del sistema:

```bash
curl -X PATCH http://localhost:3000/api/v1/system/config \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN" \
  -d '{"mode":"ASSISTED_TRADING","killSwitch":false}'
```

Consultar senales pendientes:

```bash
curl http://localhost:3000/api/v1/assisted-trading/pending-signals \
  -H "Authorization: Bearer TOKEN"
```

Aprobar hacia Paper Trading:

```bash
curl -X POST http://localhost:3000/api/v1/assisted-trading/signals/SIGNAL_ID/approve \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN" \
  -d '{"executionTarget":"PAPER_TRADING","reason":"Setup validado manualmente"}'
```

Aprobar hacia MT5 dry-run:

```bash
curl -X POST http://localhost:3000/api/v1/assisted-trading/signals/SIGNAL_ID/approve \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN" \
  -d '{"executionTarget":"MT5_DRY_RUN","reason":"Validacion dry-run MT5"}'
```

Aprobar sin ejecutar:

```bash
curl -X POST http://localhost:3000/api/v1/assisted-trading/signals/SIGNAL_ID/approve \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN" \
  -d '{"executionTarget":"NONE","reason":"Aprobada solo para seguimiento"}'
```

Rechazar:

```bash
curl -X POST http://localhost:3000/api/v1/assisted-trading/signals/SIGNAL_ID/reject \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN" \
  -d '{"reason":"No me gusta el contexto del mercado"}'
```

Auditoria:

```bash
curl http://localhost:3000/api/v1/assisted-trading/decisions \
  -H "Authorization: Bearer TOKEN"

curl http://localhost:3000/api/v1/assisted-trading/decisions/MANUAL_DECISION_ID \
  -H "Authorization: Bearer TOKEN"
```

Cada decision manual queda en `ManualTradingDecision` con `userId`, `signalId`, decision, target,
motivo, metadata, IP y user agent cuando el request los trae. Los eventos realtime emitidos son:

```text
assisted.approval_required
assisted.signal_approved
assisted.signal_rejected
assisted.execution_started
assisted.execution_completed
assisted.execution_failed
```

Reglas de seguridad:

- Solo `ADMIN` o `TRADER` pueden aprobar/rechazar.
- Aprobar exige `SignalStatus.PENDING_MANUAL_APPROVAL`.
- Aprobar exige `RiskAssessment.APPROVED`.
- Aprobar exige `SupervisorDecision.OPERATE`.
- Aprobar exige `SystemMode.ASSISTED_TRADING`.
- `killSwitch=true` bloquea aprobacion.
- No se permite doble aprobacion/rechazo.
- MT5 sigue limitado a dry-run; no hay live trading real.

### Sprint 15: LIVE_LIMITED

`LIVE_LIMITED` habilita ejecucion real limitada en MT5, pero solo bajo compuerta manual y con multiples
condiciones de seguridad. Por defecto todo sigue bloqueado.

Advertencia operativa:

```text
No activar LIVE_LIMITED con dinero real hasta probar en demo, revisar logs y confirmar limites.
No usar este modo para ejecucion automatica. Siempre requiere aprobacion manual y usuario ADMIN.
```

Condiciones obligatorias para ejecutar:

- `ENABLE_LIVE_TRADING=true`.
- `MT5_DRY_RUN=false`.
- `SystemMode=LIVE_LIMITED`.
- `killSwitch=false`.
- Usuario `ADMIN`.
- `RiskAssessment.APPROVED`.
- `SupervisorDecision.OPERATE`.
- `ManualTradingDecision.APPROVE`.
- Texto exacto de confirmacion.
- Simbolo permitido.
- Volumen bajo `maxVolumePerTrade`.
- Limite diario no alcanzado.
- Sin trade real abierto del mismo simbolo.
- Senal no ejecutada previamente en live.

Variables:

```env
ENABLE_LIVE_TRADING=false
MT5_DRY_RUN=true
BROKER_PROVIDER=MT5
MT5_WORKER_BASE_URL=http://WINDOWS_VPS_OR_LOCAL_WINDOWS:8010
```

Activar modo limitado requiere cambiar explicitamente las variables y el modo:

```bash
curl -X PATCH http://localhost:3000/api/v1/system/config \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -d '{"mode":"LIVE_LIMITED","killSwitch":false}'
```

Configurar limites:

```bash
curl -X PATCH http://localhost:3000/api/v1/live-trading/limits \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -d '{"maxDailyLiveTrades":1,"maxDailyLoss":50,"maxVolumePerTrade":0.01,"allowedSymbols":["XAUUSD","BTCUSDT"],"isActive":true}'
```

Consultar limites:

```bash
curl http://localhost:3000/api/v1/live-trading/limits \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

Ejecutar una orden real limitada:

```bash
curl -X POST http://localhost:3000/api/v1/live-trading/signals/SIGNAL_ID/execute \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -d '{"manualDecisionId":"MANUAL_DECISION_ID","confirmationText":"CONFIRMO EJECUCION REAL LIMITADA"}'
```

Verificar auditoria:

```bash
curl http://localhost:3000/api/v1/live-trading/logs \
  -H "Authorization: Bearer ADMIN_TOKEN"

curl http://localhost:3000/api/v1/live-trading/trades \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

Apagar con kill switch:

```bash
curl -X PATCH http://localhost:3000/api/v1/system/config \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -d '{"killSwitch":true}'
```

Volver a modo seguro:

```bash
curl -X PATCH http://localhost:3000/api/v1/system/config \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -d '{"mode":"SAFE_MODE","killSwitch":true}'
```

Eventos realtime:

```text
live.execution_requested
live.execution_blocked
live.execution_success
live.execution_failed
live.trade_opened
```

### Sprint 16: Analytics y reportes

`AnalyticsModule` agrega métricas avanzadas de rendimiento sin modificar ningún flujo de ejecución. Lee
trades de backtesting, paper trading y live limited, normaliza los datos y calcula métricas comunes.

Fuentes soportadas:

- `BACKTEST`: `BacktestTrade`.
- `PAPER_TRADING`: `PaperTrade` cerrado.
- `LIVE_LIMITED`: `LiveTrade` si tiene PnL disponible en `responsePayload` o datos de cierre.

Métricas:

- `winRate = winningTrades / totalTrades`
- `lossRate = losingTrades / totalTrades`
- `profitFactor = grossProfit / abs(grossLoss)`
- `netPnL = suma(pnl)`
- `averageWin = promedio(pnl > 0)`
- `averageLoss = promedio(pnl < 0)`
- `expectancy = (winRate * averageWin) - (lossRate * abs(averageLoss))`
- `maxDrawdown = máxima caída desde pico de equity acumulada`
- `averageRiskReward`, `bestTrade`, `worstTrade`

Endpoints:

```bash
curl "http://localhost:3000/api/v1/analytics/summary?executionType=PAPER_TRADING&from=2026-01-01&to=2026-01-31" \
  -H "Authorization: Bearer TOKEN"

curl "http://localhost:3000/api/v1/analytics/daily?executionType=PAPER_TRADING" \
  -H "Authorization: Bearer TOKEN"

curl "http://localhost:3000/api/v1/analytics/weekly?executionType=BACKTEST" \
  -H "Authorization: Bearer TOKEN"

curl "http://localhost:3000/api/v1/analytics/by-strategy?executionType=BACKTEST" \
  -H "Authorization: Bearer TOKEN"

curl "http://localhost:3000/api/v1/analytics/by-symbol?executionType=PAPER_TRADING" \
  -H "Authorization: Bearer TOKEN"

curl "http://localhost:3000/api/v1/analytics/by-timeframe?executionType=BACKTEST" \
  -H "Authorization: Bearer TOKEN"

curl "http://localhost:3000/api/v1/analytics/equity-curve?executionType=PAPER_TRADING" \
  -H "Authorization: Bearer TOKEN"
```

Filtros disponibles:

```text
executionType=BACKTEST | PAPER_TRADING | LIVE_LIMITED
instrumentId=...
symbol=...
strategyId=...
timeframe=M1 | M5 | M15 | M30 | H1 | H4 | D1
from=YYYY-MM-DD
to=YYYY-MM-DD
```

Exportar CSV:

```bash
curl "http://localhost:3000/api/v1/analytics/export.csv?type=trades&executionType=PAPER_TRADING" \
  -H "Authorization: Bearer ADMIN_OR_TRADER_TOKEN"

curl "http://localhost:3000/api/v1/analytics/export.csv?type=daily&executionType=PAPER_TRADING" \
  -H "Authorization: Bearer ADMIN_OR_TRADER_TOKEN"

curl "http://localhost:3000/api/v1/analytics/export.csv?type=weekly&executionType=BACKTEST" \
  -H "Authorization: Bearer ADMIN_OR_TRADER_TOKEN"

curl "http://localhost:3000/api/v1/analytics/export.csv?type=strategy&executionType=BACKTEST" \
  -H "Authorization: Bearer ADMIN_OR_TRADER_TOKEN"

curl "http://localhost:3000/api/v1/analytics/export.csv?type=symbol&executionType=PAPER_TRADING" \
  -H "Authorization: Bearer ADMIN_OR_TRADER_TOKEN"
```

Seguridad:

- Consultas: `ADMIN`, `TRADER`, `VIEWER`.
- Exportación CSV: solo `ADMIN` o `TRADER`.

Limitaciones actuales:

- `LIVE_LIMITED` no inventa PnL: solo incluye métricas cuando exista PnL disponible.
- Los snapshots `AnalyticsReportSnapshot` quedan modelados para auditoría futura, pero este sprint se
  centra en cálculo y exposición de métricas bajo demanda.
- No se modifica lógica de ejecución, estrategias ni live trading.

### Sprint 17: Technical Agent avanzado

El worker técnico ahora produce un análisis más robusto y determinístico para reducir señales falsas.
No usa machine learning, no ejecuta operaciones y no cambia los flujos de Risk, Supervisor, Paper,
Assisted ni Live Limited.

Nuevas capacidades:

- Soportes y resistencias por swing highs/lows agrupados por tolerancia porcentual.
- Detección de régimen: `TRENDING`, `RANGING`, `HIGH_VOLATILITY`, `LOW_VOLATILITY`.
- Filtro de volatilidad usando `ATR14 / close`.
- Confirmación multi-timeframe con `ALIGNED`, `PARTIAL` o `CONFLICTED`.
- `confidenceScore` con penalizaciones por rango, conflicto MTF y volatilidad extrema.
- Metadata técnica extendida en `AgentDecision.metadata`.

Variables:

```env
TECHNICAL_SR_LOOKBACK=100
TECHNICAL_SR_TOLERANCE_PERCENT=0.002
TECHNICAL_LOW_VOL_ATR_PERCENT=0.003
TECHNICAL_HIGH_VOL_ATR_PERCENT=0.03
TECHNICAL_ENABLE_MULTI_TIMEFRAME=true
TECHNICAL_CONFIRMATION_TIMEFRAMES=H1,H4
SIGNAL_BLOCK_RANGING_MARKET=true
SIGNAL_BLOCK_MTF_CONFLICT=true
```

Probar worker directamente:

```bash
curl -X POST http://localhost:8000/technical-analysis/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "symbol":"BTCUSDT",
    "primaryTimeframe":"M15",
    "timeframes":{
      "M15":[...],
      "H1":[...],
      "H4":[...]
    }
  }'
```

El request anterior sigue funcionando:

```json
{
  "symbol": "BTCUSDT",
  "timeframe": "M15",
  "candles": []
}
```

Probar desde backend:

```bash
curl -X POST http://localhost:3000/api/v1/agents/technical/analyze \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN" \
  -d '{
    "instrumentId":"INSTRUMENT_ID",
    "primaryTimeframe":"M15",
    "confirmationTimeframes":["H1","H4"],
    "limit":1000
  }'
```

La respuesta y `AgentDecision.metadata` incluyen:

```text
indicators
supportResistance
marketRegime
multiTimeframe
warnings
rawResponse
```

Cambios en generación de señales:

- No genera `BUY` si el mercado está en rango.
- No genera `BUY` si MTF está `CONFLICTED`.
- No genera `BUY` si el precio está demasiado cerca de la resistencia.
- No genera `SELL` si el mercado está en rango.
- No genera `SELL` si MTF está `CONFLICTED`.
- No genera `SELL` si el precio está demasiado cerca del soporte.

Backtesting con filtros:

```bash
curl -X POST http://localhost:3000/api/v1/backtesting/run \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN" \
  -d '{
    "instrumentId":"INSTRUMENT_ID",
    "timeframe":"M15",
    "startDate":"2024-01-01T00:00:00.000Z",
    "endDate":"2024-03-01T00:00:00.000Z",
    "initialBalance":10000,
    "useSupportResistanceFilter":true,
    "useMarketRegimeFilter":true,
    "useMultiTimeframeConfirmation":true
  }'
```

Métricas adicionales de comparación:

```text
signalsBeforeFilters
signalsAfterFilters
filteredSignals
filterReasons
```

Estas métricas permiten comparar si los filtros reducen entradas en rango, conflictos MTF o entradas
pegadas a niveles técnicos.

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
    supervisor/
    system/
    paper-trading/
    broker/
    assisted-trading/
    live-trading/
    analytics/
services/
  agents/
  mt5-worker/
```

Cada modulo de negocio separa:

- `domain`: entidades, puertos/repositorios e interfaces.
- `application`: casos de uso y servicios de aplicacion.
- `infrastructure`: adaptadores concretos, por ahora Prisma.
- `presentation`: controllers y DTOs HTTP.

## Listo para Sprint 10

- Definir politicas de portfolio sobre multiples instrumentos y cuentas.
- Exponer metricas agregadas de cuenta/trades para dashboard.
- Mostrar decisiones de Technical/Risk/Supervisor y razonamiento por senal.
- Agregar controles visuales para `SystemConfig`, kill switch y estado de colas.
- Preparar integracion sandbox con broker sin tocar ejecucion real todavia.
