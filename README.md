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

## Ejecutar con Docker Compose

```bash
docker compose up --build
```

La API queda disponible en:

- API: `http://localhost:3000/api/v1`
- Swagger: `http://localhost:3000/api/docs`
- Health: `http://localhost:3000/api/v1/health`

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
provider Binance, sincronizacion historica y controller de sync.

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

Calcular riesgo:

```bash
curl -X POST http://localhost:3000/api/v1/risk/calculate-position-size \
  -H "Content-Type: application/json" \
  -d '{"accountBalance":10000,"riskPercent":1,"entryPrice":2000,"stopLoss":1990,"takeProfit":2020,"instrumentId":"<instrument-id>"}'
```

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
    agents/
    risk/
    paper-trading/
```

Cada modulo de negocio separa:

- `domain`: entidades, puertos/repositorios e interfaces.
- `application`: casos de uso y servicios de aplicacion.
- `infrastructure`: adaptadores concretos, por ahora Prisma.
- `presentation`: controllers y DTOs HTTP.

## Listo para Sprint 2

- Conectar proveedores reales de market data.
- Encolar ingestion, generacion de señales y decisiones.
- Implementar agentes tecnicos/fundamentales/riesgo sobre las interfaces existentes.
- Agregar backtesting y metricas de performance.
- Integrar brokers en modo sandbox antes de cualquier ejecucion real.
