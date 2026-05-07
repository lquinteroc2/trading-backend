# Frontend Integration Guide

Guia practica para construir una web Next.js encima de este backend.

## Resumen

Este backend expone una API NestJS para una plataforma de trading con:

- Autenticacion JWT.
- Instrumentos financieros.
- Velas OHLCV e ingesta historica desde Binance.
- Worker Python de analisis tecnico.
- Decisiones de agentes.
- Generacion de senales.
- Riesgo.
- Supervisor.
- Paper trading.
- Backtesting.
- Colas BullMQ sobre Redis.
- Configuracion global del sistema.

URLs locales con Docker:

```txt
Backend API:          http://localhost:3000/api/v1
Swagger:              http://localhost:3000/api/docs
Backend health:       http://localhost:3000/api/v1/health
Technical worker:     http://localhost:8000/health
Postgres:             localhost:5432
Redis:                localhost:6379
```

## Arranque Del Backend

Desde `trading-backend`:

```bash
cp .env.example .env
docker compose up -d --build
```

El entrypoint del contenedor backend ejecuta `prisma migrate deploy` antes de iniciar Nest.

Seed manual, si hace falta:

```bash
docker compose exec backend npm run prisma:seed
```

Credenciales iniciales:

```txt
email:    admin@trading.local
password: ChangeMe123!
```

El seed crea tambien:

- Instrumentos: `BTCUSDT`, `XAUUSD`, `EURUSD`, `NAS100`.
- Estrategia: `EMA_TREND_STRATEGY`.
- Risk profile: `DEFAULT_PROFILE`.
- Paper account: `DEFAULT_PAPER_ACCOUNT`.

## Variables Para Next.js

En el frontend:

```env
NEXT_PUBLIC_APP_NAME=Trading Platform
NEXT_PUBLIC_API_BASE_URL=http://localhost:3000/api/v1
API_BASE_URL=http://localhost:3000/api/v1
```

Recomendacion:

- Usa `API_BASE_URL` en Server Components, Server Actions y Route Handlers.
- Para web, se recomienda el patron BFF/proxy de Next: el browser habla con Next y Next reenvia al backend.
- El backend tambien soporta llamadas directas desde browser con cookies `HttpOnly` y CORS con credentials para origins confiables.
- Configura `CORS_ORIGINS` con los frontends permitidos, por ejemplo `http://localhost:3001`.

Ejemplo de cliente API para Next:

```ts
const API_BASE_URL = process.env.API_BASE_URL ?? 'http://localhost:3000/api/v1';

export async function apiFetch<T>(
  path: string,
  options: RequestInit & { token?: string } = {},
): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set('Content-Type', 'application/json');
  if (options.token) {
    headers.set('Authorization', `Bearer ${options.token}`);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
    cache: 'no-store',
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`API ${response.status}: ${body}`);
  }

  return response.json() as Promise<T>;
}
```

## Autenticacion

Login:

```http
POST /auth/login
Content-Type: application/json

{
  "email": "admin@trading.local",
  "password": "ChangeMe123!"
}
```

Respuesta esperada: token JWT y datos basicos del usuario.

El backend tambien setea cookies:

- `trading_access_token`: cookie `HttpOnly` para requests autenticados.
- `trading_refresh_token`: cookie `HttpOnly` limitada a `/api/v1/auth/refresh`.

El `refreshToken` no se devuelve en el body; solo via cookie `HttpOnly`. En base de datos se guarda hasheado y se rota en cada refresh, dejando revocado el token anterior.

Refresh de sesion:

```http
POST /auth/refresh
Cookie: trading_refresh_token=<refresh-token-cookie>
```

Logout:

```http
POST /auth/logout
```

Usuario actual:

```http
GET /auth/me
Authorization: Bearer <token>
```

Tambien puedes autenticar `GET /auth/me` con cookie `trading_access_token`. Se mantiene `Authorization: Bearer <token>` para compatibilidad con BFF, Swagger, Postman y clientes mobile.

## Enums Utiles

```ts
export type Role = 'ADMIN' | 'TRADER' | 'VIEWER';
export type MarketType = 'FOREX' | 'CRYPTO' | 'INDEX' | 'COMMODITY' | 'STOCK';
export type Timeframe = 'M1' | 'M5' | 'M15' | 'M30' | 'H1' | 'H4' | 'D1';
export type SignalDirection = 'BUY' | 'SELL' | 'NONE' | 'NEUTRAL';
export type SignalStatus =
  | 'CREATED'
  | 'UNDER_REVIEW'
  | 'PENDING'
  | 'APPROVED'
  | 'REJECTED'
  | 'EXPIRED'
  | 'EXECUTED';
export type SourceAgent = 'TECHNICAL' | 'FUNDAMENTAL' | 'RISK' | 'SUPERVISOR' | 'MANUAL';
export type AgentType = 'TECHNICAL' | 'FUNDAMENTAL' | 'RISK' | 'EXECUTION' | 'SUPERVISOR';
export type AgentDecisionAction = 'APPROVE' | 'REJECT' | 'WAIT' | 'MODIFY';
export type TradeDirection = 'BUY' | 'SELL';
export type PaperTradeStatus = 'OPEN' | 'CLOSED' | 'CANCELLED';
export type PaperTradeResult = 'WIN' | 'LOSS' | 'BREAKEVEN' | 'OPEN';
export type PaperTradeCloseReason = 'STOP_LOSS' | 'TAKE_PROFIT' | 'MANUAL' | 'SYSTEM';
export type BacktestStatus = 'RUNNING' | 'COMPLETED' | 'FAILED';
export type RiskAssessmentDecision = 'APPROVED' | 'REJECTED' | 'ADJUSTED';
export type SupervisorDecisionAction = 'OPERATE' | 'WAIT' | 'BLOCK';
export type SystemMode = 'PAPER_TRADING' | 'SAFE_MODE' | 'PAUSED';
export type DataSyncStatus = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';
```

## Endpoints Por Modulo

Todos los paths parten de:

```txt
http://localhost:3000/api/v1
```

### Health

```http
GET /health
```

Uso frontend: status badge del backend.

### Auth

```http
POST /auth/login
GET  /auth/me
```

Pantallas sugeridas:

- Login.
- Perfil de usuario actual.
- Guard de rutas privadas.

### Instruments

```http
POST   /instruments
GET    /instruments
GET    /instruments/:id
PATCH  /instruments/:id
DELETE /instruments/:id
```

Crear instrumento:

```json
{
  "symbol": "BTCUSDT",
  "name": "Bitcoin vs Tether",
  "marketType": "CRYPTO",
  "brokerSymbol": "BTCUSDT"
}
```

UI sugerida:

- Tabla de instrumentos.
- Filtro por activo/inactivo.
- Formulario de crear/editar.
- Selector global de instrumento para dashboards.

### Market Data

```http
POST /market-data/candles
POST /market-data/candles/bulk
GET  /market-data/candles
```

Crear vela:

```json
{
  "instrumentId": "<instrument-id>",
  "timeframe": "M15",
  "open": 42000.5,
  "high": 42100,
  "low": 41950,
  "close": 42080,
  "volume": 123.45,
  "timestamp": "2026-04-30T22:00:00.000Z",
  "source": "BINANCE"
}
```

Consultar velas:

```http
GET /market-data/candles?instrumentId=<id>&timeframe=M15&limit=500&order=asc
```

Query params:

- `instrumentId`
- `timeframe`
- `from`
- `to`
- `limit`
- `order`: `asc` o `desc`

UI sugerida:

- Chart OHLC/candlestick.
- Tabla de velas.
- Filtros por instrumento, timeframe y rango.

### Historical Sync

```http
POST /market-data/sync
POST /market-data/sync/enqueue
GET  /market-data/sync-jobs
GET  /market-data/sync-jobs/:id
```

Sincronizar desde Binance:

```json
{
  "instrumentId": "<btc-instrument-id>",
  "timeframe": "M15",
  "startTime": "2026-04-28T00:00:00.000Z",
  "endTime": "2026-04-30T00:00:00.000Z",
  "limit": 1000,
  "provider": "BINANCE",
  "triggerAnalysis": false
}
```

Respuesta importante:

```json
{
  "syncJobId": "...",
  "provider": "BINANCE",
  "symbol": "BTCUSDT",
  "timeframe": "M15",
  "fetchedCount": 220,
  "insertedCount": 220,
  "skippedDuplicates": 0,
  "status": "COMPLETED"
}
```

Nota Binance:

- El backend usa endpoint publico de klines.
- No requiere API key para velas historicas.
- Simbolos soportados hoy por el provider: `BTCUSDT`, `ETHUSDT`.

UI sugerida:

- Modal/form para sincronizar historico.
- Historial de sync jobs.
- Badge de estado: `PENDING`, `RUNNING`, `COMPLETED`, `FAILED`.

### Technical Agents

```http
POST /agents/technical/analyze
POST /agents/technical/analyze/enqueue
GET  /agents/technical/latest
POST /agents/decisions
GET  /agents/decisions
GET  /agents/decisions/:id
```

Analisis tecnico directo:

```json
{
  "instrumentId": "<instrument-id>",
  "timeframe": "M15",
  "limit": 220
}
```

Respuesta tipica:

```json
{
  "symbol": "BTCUSDT",
  "timeframe": "M15",
  "candlesAnalyzed": 220,
  "trend": "BEARISH",
  "technicalBias": "BEARISH",
  "confidenceScore": 90,
  "indicators": {
    "ema20": 75736.48,
    "ema50": 75887.34,
    "ema200": 76382.33,
    "rsi14": 49.4,
    "atr14": 187.48
  },
  "reasoning": ["EMA20 is below EMA50 and EMA50 is below EMA200"],
  "warnings": [],
  "agentDecisionId": "...",
  "decision": "APPROVE"
}
```

Requisitos:

- Tener al menos `TECHNICAL_ANALYSIS_MIN_CANDLES`, por defecto 200.
- El worker Python debe estar vivo en `technical-agent-worker:8000` dentro de Docker.

UI sugerida:

- Panel de analisis tecnico por instrumento/timeframe.
- Indicadores EMA/RSI/ATR.
- Timeline de decisiones de agentes.
- Boton "Analyze now".
- Boton "Queue analysis".

### Signals

```http
POST  /signals
GET   /signals
GET   /signals/:id
PATCH /signals/:id/status
POST  /signals/generate
```

Crear senal manual:

```json
{
  "instrumentId": "<instrument-id>",
  "direction": "BUY",
  "entryPrice": 42080,
  "stopLoss": 41500,
  "takeProfit": 43200,
  "confidenceScore": 75,
  "sourceAgent": "MANUAL",
  "reasoning": "Manual test signal",
  "expiresAt": "2026-05-02T00:00:00.000Z"
}
```

Generar senal desde estrategia:

```json
{
  "instrumentId": "<instrument-id>",
  "timeframe": "M15"
}
```

Actualizar estado:

```json
{
  "status": "APPROVED"
}
```

UI sugerida:

- Inbox de senales.
- Kanban o tabla por status.
- Acciones: aprobar, rechazar, ejecutar, expirar.
- Detalle con razonamiento e indicadores.

### Risk

```http
POST /risk/calculate-position-size
POST /agents/risk/evaluate
POST /agents/risk/evaluate/enqueue
GET  /agents/risk/assessments
```

Calcular position size:

```json
{
  "accountBalance": 10000,
  "riskPercent": 1,
  "entryPrice": 42080,
  "stopLoss": 41500,
  "takeProfit": 43200,
  "instrumentId": "<instrument-id>"
}
```

Evaluar riesgo de una senal:

```json
{
  "signalId": "<signal-id>"
}
```

UI sugerida:

- Calculadora de position sizing.
- Risk assessments por senal.
- Alertas por drawdown/max open trades.

### Supervisor

```http
POST /agents/supervisor/decide
POST /agents/supervisor/decide/enqueue
GET  /agents/supervisor/decisions
GET  /agents/supervisor/decisions/:id
```

Decidir sobre una senal:

```json
{
  "signalId": "<signal-id>"
}
```

UI sugerida:

- Panel de aprobacion final.
- Motivos de `OPERATE`, `WAIT` o `BLOCK`.
- Vista de pipeline: technical -> signal -> risk -> supervisor.

### Paper Trading

```http
POST  /paper-trading/accounts
GET   /paper-trading/accounts
GET   /paper-trading/accounts/:id
POST  /paper-trading/trades/open
GET   /paper-trading/trades
GET   /paper-trading/trades/:id
PATCH /paper-trading/trades/:id/close
POST  /paper-trading/evaluate-candle
```

Crear cuenta:

```json
{
  "name": "DEFAULT_PAPER_ACCOUNT",
  "initialBalance": 10000,
  "currency": "USD"
}
```

Abrir trade desde senal:

```json
{
  "signalId": "<signal-id>",
  "accountId": "default-paper-account"
}
```

Cerrar trade:

```json
{
  "closePrice": 42500,
  "closeReason": "MANUAL"
}
```

Filtros para trades:

```http
GET /paper-trading/trades?accountId=<id>&instrumentId=<id>&status=OPEN
```

UI sugerida:

- Dashboard de cuenta paper: balance, equity, PnL.
- Tabla de trades abiertos/cerrados.
- Boton cerrar trade manualmente.
- Historial por instrumento.

### Backtesting

```http
POST /backtesting/run
GET  /backtesting
GET  /backtesting/:id
GET  /backtesting/:id/trades
```

Ejecutar backtest:

```json
{
  "instrumentId": "<instrument-id>",
  "timeframe": "M15",
  "startDate": "2026-04-01T00:00:00.000Z",
  "endDate": "2026-05-01T00:00:00.000Z",
  "initialBalance": 10000,
  "strategyId": "EMA_TREND_STRATEGY",
  "riskPercent": 0.01
}
```

Requisito actual:

- El backtest requiere al menos 500 velas en el rango.

UI sugerida:

- Form de backtest.
- Tabla de runs.
- Detalle con metricas.
- Lista de trades del backtest.
- Curva de equity.

### System Config

```http
GET   /system/config
PATCH /system/config
```

Actualizar configuracion:

```json
{
  "mode": "PAPER_TRADING",
  "killSwitch": false
}
```

UI sugerida:

- Header global con modo del sistema.
- Switch de kill switch.
- Estados: `PAPER_TRADING`, `SAFE_MODE`, `PAUSED`.

### Queues

```http
GET /queues/technical-analysis
GET /queues/signal-generation
```

Respuesta:

```json
{
  "active": [],
  "failed": [],
  "completed": [],
  "waiting": [],
  "delayed": []
}
```

UI sugerida:

- Monitor simple de jobs.
- Badge de fallos.
- Tabla de payloads recientes.

## Flujos Recomendados Para La Web

### Primer Dashboard

1. Login.
2. Cargar `GET /instruments`.
3. Seleccionar instrumento y timeframe.
4. Consultar velas con `GET /market-data/candles`.
5. Mostrar chart.
6. Ejecutar `POST /agents/technical/analyze`.
7. Mostrar decision tecnica, indicadores y reasoning.
8. Mostrar senales recientes con `GET /signals`.

### Flujo De Datos Historicos

1. Usuario selecciona instrumento, timeframe, fecha inicial, fecha final y limite.
2. Front llama `POST /market-data/sync`.
3. Back consulta Binance y guarda velas.
4. Front refresca chart con `GET /market-data/candles`.
5. Opcional: usuario ejecuta `POST /agents/technical/analyze`.

### Flujo Semi-Automatizado

1. `POST /market-data/sync` con `triggerAnalysis: true`.
2. Back emite evento de vela cerrada.
3. BullMQ encola analisis tecnico.
4. Analisis crea decision.
5. Decision tecnica puede disparar generacion de senal.
6. Senal puede pasar por riesgo y supervisor.
7. Paper trading abre/evalua trades segun senal y velas.

Para UI, modela esto como pipeline:

```txt
Market Data -> Technical Analysis -> Signal -> Risk -> Supervisor -> Paper Trade
```

## Estructura Sugerida Del Frontend

```txt
trading-frontend/
  app/
    (auth)/login/page.tsx
    (dashboard)/dashboard/page.tsx
    (dashboard)/instruments/page.tsx
    (dashboard)/market-data/page.tsx
    (dashboard)/agents/page.tsx
    (dashboard)/signals/page.tsx
    (dashboard)/risk/page.tsx
    (dashboard)/paper-trading/page.tsx
    (dashboard)/backtesting/page.tsx
    api/proxy/[...path]/route.ts
  components/
    charts/
    forms/
    layout/
    tables/
    trading/
  lib/
    api/
      client.ts
      auth.ts
      instruments.ts
      market-data.ts
      agents.ts
      signals.ts
      risk.ts
      paper-trading.ts
      backtesting.ts
    types/
      api.ts
      enums.ts
```

## Componentes Prioritarios

1. `LoginForm`
2. `AppShell`
3. `InstrumentSelector`
4. `TimeframeSelector`
5. `CandlestickChart`
6. `HistoricalSyncForm`
7. `TechnicalAnalysisPanel`
8. `SignalsTable`
9. `RiskCalculator`
10. `PaperAccountSummary`
11. `PaperTradesTable`
12. `BacktestRunForm`
13. `QueueStatusPanel`
14. `SystemModeBadge`

## Librerias Frontend Recomendadas

Base:

- Next.js App Router.
- TypeScript.
- Tailwind CSS.
- shadcn/ui o componentes propios.
- TanStack Query si vas a hacer bastante client-side fetching.
- React Hook Form + Zod para formularios.
- Recharts para metricas simples.
- Lightweight Charts o TradingView Lightweight Charts para velas.

Autenticacion:

- Cookie httpOnly si haces proxy/server actions.
- Evita guardar JWT en `localStorage` para produccion.

## Notas De Integracion

- Fechas: enviar siempre ISO 8601 UTC, ejemplo `2026-05-01T00:00:00.000Z`.
- IDs: usar UUIDs devueltos por el backend, no symbols, salvo donde el payload lo pida.
- Binance soportado hoy: `BTCUSDT`, `ETHUSDT` en el provider.
- Backtesting necesita suficientes velas antes de correr.
- Analisis tecnico necesita minimo 200 velas por defecto.
- Redis no requiere plataforma externa si usas Docker.
- Binance market data publico no requiere API key.
- Si luego agregas ejecucion real, ahi si vas a necesitar credenciales/API keys de broker o exchange.

## Checklist Antes De Empezar Next.js

- [ ] `docker compose ps` muestra backend, postgres, redis y technical-agent-worker arriba.
- [ ] `GET /api/v1/health` responde `ok`.
- [ ] `GET /health` del worker responde `ok`.
- [ ] `POST /auth/login` devuelve token.
- [ ] `GET /instruments` devuelve instrumentos seed.
- [ ] Hay al menos 200 velas para probar analisis tecnico.
- [ ] Hay al menos 500 velas para probar backtesting.
- [ ] Decidir si Next llamara al backend desde server-side o si se habilitara CORS.
