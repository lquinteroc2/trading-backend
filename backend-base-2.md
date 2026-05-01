Actúa como arquitecto senior backend experto en NestJS, TypeScript, arquitectura hexagonal, Prisma, PostgreSQL, Redis, BullMQ, Binance API, trading algorítmico y sistemas de datos financieros.

Ya completé el Sprint 1 del backend del proyecto INVERSIONES.

CONTEXTO DEL PROYECTO
INVERSIONES es una plataforma privada de trading inteligente para uso personal. El objetivo inicial no es operar dinero real, sino construir una infraestructura privada para consumir datos de mercado, generar señales, hacer backtesting, paper trading, gestión de riesgo y decisiones de agentes.

En el Sprint 1 ya existe:
- Backend NestJS.
- Arquitectura hexagonal.
- PostgreSQL.
- Prisma.
- Redis.
- BullMQ.
- Auth interno con JWT.
- Módulo de instrumentos.
- Módulo de market candles / OHLCV.
- Módulo de señales.
- Módulo de agentes.
- Módulo de riesgo.
- Módulo de paper trading.
- Docker Compose.
- Swagger.
- Tests básicos.
- Seeds iniciales con instrumentos como BTCUSDT, XAUUSD, NAS100 y EURUSD.

OBJETIVO DEL SPRINT 2
Implementar el módulo profesional de ingesta de datos históricos.

El sistema debe poder conectarse inicialmente a Binance, descargar velas históricas OHLCV de BTCUSDT, normalizarlas al modelo interno, guardarlas en PostgreSQL y evitar duplicados.

Este sprint NO debe:
- Ejecutar operaciones reales.
- Generar señales todavía.
- Hacer backtesting todavía.
- Usar IA.
- Conectarse a MT5 todavía.
- Modificar la arquitectura base de Sprint 1 de forma destructiva.

STACK OBLIGATORIO
- NestJS
- TypeScript
- Prisma
- PostgreSQL
- Redis
- BullMQ
- Docker Compose
- Axios o fetch HTTP client
- Swagger
- Jest

REGLAS TÉCNICAS OBLIGATORIAS
1. Mantener arquitectura hexagonal.
2. No acoplar dominio a Binance.
3. Crear interfaces de proveedores de datos.
4. Binance debe ser una implementación de infraestructura.
5. El dominio debe trabajar con velas normalizadas internas.
6. Evitar duplicados por instrumentId + timeframe + timestamp.
7. Registrar logs de sincronización.
8. Persistir estado de cada sync.
9. Soportar sync manual vía endpoint.
10. Preparar el diseño para futuros providers: MT5, Polygon, TwelveData, AlphaVantage, Yahoo Finance o broker propio.

MÓDULOS A IMPLEMENTAR O MEJORAR

1. Market Data Provider Abstraction

Crear una interfaz en application o domain:

MarketDataProvider

Debe exponer métodos como:

- getName(): string
- supportsSymbol(symbol: string): boolean
- fetchHistoricalCandles(params): Promise<NormalizedCandle[]>

Crear tipos:

FetchHistoricalCandlesParams:
- symbol: string
- timeframe: Timeframe
- startTime: Date
- endTime?: Date
- limit?: number

NormalizedCandle:
- symbol: string
- timeframe: Timeframe
- open: number
- high: number
- low: number
- close: number
- volume: number
- timestamp: Date
- source: string
- raw?: unknown

2. Binance Market Data Provider

Crear implementación:

BinanceMarketDataProvider

Debe usar el endpoint público de Binance:

GET /api/v3/klines

Debe soportar al menos:
- BTCUSDT
- ETHUSDT opcional

Timeframes internos a mapear:
- M1 -> 1m
- M5 -> 5m
- M15 -> 15m
- M30 -> 30m
- H1 -> 1h
- H4 -> 4h
- D1 -> 1d

Debe convertir la respuesta de Binance a NormalizedCandle.

Cada kline de Binance debe mapear:
- openTime -> timestamp
- open
- high
- low
- close
- volume
- source = BINANCE

Importante:
- Los valores numéricos deben guardarse como Decimal o number según el patrón actual del proyecto.
- Validar errores HTTP.
- Manejar rate limits con errores claros.
- No quemar URLs en múltiples lugares; usar config.

3. Historical Data Sync Use Case

Crear caso de uso:

SyncHistoricalCandlesUseCase

Input:
- instrumentId
- timeframe
- startTime
- endTime opcional
- limit opcional
- provider opcional, default BINANCE

Proceso:
1. Buscar el instrumento en base de datos.
2. Validar que el instrumento existe y está activo.
3. Resolver el provider.
4. Descargar velas históricas.
5. Normalizar velas.
6. Guardar velas evitando duplicados.
7. Registrar resultado de sync.
8. Retornar resumen.

Output esperado:
- provider
- instrumentId
- symbol
- timeframe
- requestedFrom
- requestedTo
- fetchedCount
- insertedCount
- skippedDuplicates
- firstCandleAt
- lastCandleAt
- status
- error opcional

4. Persistencia de candles sin duplicados

Mejorar o crear método en repository:

upsertManyCandles(candles)

Debe:
- Insertar velas nuevas.
- Omitir duplicadas.
- Usar unique constraint por:
  - instrumentId
  - timeframe
  - timestamp

Si Prisma no permite skipDuplicates con la configuración actual, usar createMany con skipDuplicates o alternativa segura.

Validar que exista índice único en schema.prisma:

@@unique([instrumentId, timeframe, timestamp])

5. Data Sync Job / Sync Log

Crear entidad nueva si no existe:

MarketDataSyncJob o DataSyncLog

Campos recomendados:
- id
- provider
- instrumentId
- symbol
- timeframe
- startTime
- endTime
- status: PENDING | RUNNING | COMPLETED | FAILED
- requestedLimit
- fetchedCount
- insertedCount
- skippedDuplicates
- errorMessage
- startedAt
- finishedAt
- createdAt

Objetivo:
Todo proceso de ingesta debe quedar auditado.

6. API Endpoints

Crear o mejorar controlador:

MarketDataSyncController

Endpoints:

POST /market-data/sync

Body:
{
  "instrumentId": "uuid",
  "timeframe": "M15",
  "startTime": "2024-01-01T00:00:00.000Z",
  "endTime": "2024-01-15T00:00:00.000Z",
  "limit": 1000,
  "provider": "BINANCE"
}

Respuesta:
{
  "syncJobId": "uuid",
  "provider": "BINANCE",
  "symbol": "BTCUSDT",
  "timeframe": "M15",
  "fetchedCount": 1000,
  "insertedCount": 1000,
  "skippedDuplicates": 0,
  "status": "COMPLETED"
}

GET /market-data/sync-jobs

Query opcional:
- provider
- instrumentId
- timeframe
- status
- from
- to

GET /market-data/sync-jobs/:id

GET /market-data/candles

Query:
- instrumentId
- timeframe
- from
- to
- limit
- order asc/desc

7. BullMQ opcional pero recomendado

Si ya existe BullMQ en Sprint 1, agregar cola:

historical-market-data-sync-queue

Crear job:
- sync-historical-candles

Payload:
- instrumentId
- timeframe
- startTime
- endTime
- limit
- provider

Crear endpoint alternativo:

POST /market-data/sync/enqueue

Debe encolar el trabajo y devolver:
- jobId
- status: QUEUED

El worker debe:
- Ejecutar SyncHistoricalCandlesUseCase.
- Actualizar el DataSyncLog.
- Registrar errores.

Importante:
El endpoint POST /market-data/sync puede ejecutar sync directo.
El endpoint POST /market-data/sync/enqueue puede ejecutar sync vía cola.

8. Validaciones

Validar:
- instrumentId requerido.
- timeframe válido.
- startTime requerido.
- endTime mayor que startTime si se envía.
- limit máximo 1000 para Binance por request.
- provider válido.
- instrumento activo.
- símbolo soportado por provider.
- No permitir provider BINANCE para símbolos incompatibles si no están mapeados.

9. Configuración

Agregar variables a .env.example:

BINANCE_API_BASE_URL=https://api.binance.com
MARKET_DATA_DEFAULT_PROVIDER=BINANCE
MARKET_DATA_SYNC_DEFAULT_LIMIT=1000
MARKET_DATA_SYNC_MAX_LIMIT=1000

10. Swagger

Documentar:
- DTOs.
- enums.
- responses.
- errores.
- ejemplos de request para BTCUSDT M15.

11. Tests

Crear tests unitarios para:

BinanceMarketDataProvider:
- Mapea klines correctamente.
- Convierte timeframe interno a Binance interval.
- Maneja errores de Binance.

SyncHistoricalCandlesUseCase:
- Falla si el instrumento no existe.
- Falla si el instrumento está inactivo.
- Guarda velas nuevas.
- Omite duplicadas.
- Retorna resumen correcto.

MarketDataSyncController:
- Valida DTOs.
- Responde estructura esperada.

12. README

Actualizar README con sección Sprint 2:

Debe explicar:
- Cómo configurar Binance.
- Cómo correr Docker.
- Cómo correr migraciones.
- Cómo ejecutar seed.
- Cómo llamar endpoint de sync.
- Ejemplo curl para BTCUSDT.
- Cómo consultar candles.
- Cómo revisar sync jobs.

Ejemplo curl:

curl -X POST http://localhost:3000/market-data/sync \
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

CRITERIOS DE ACEPTACIÓN DEL SPRINT 2

El Sprint 2 estará completo cuando:

1. Exista una interfaz MarketDataProvider.
2. Exista BinanceMarketDataProvider.
3. Se pueda descargar histórico de BTCUSDT desde Binance.
4. Se puedan guardar mínimo 1.000 velas.
5. Al repetir el mismo sync no se dupliquen velas.
6. Exista constraint único en candles.
7. Exista log/auditoría de cada sincronización.
8. Existan endpoints para iniciar sync y consultar sync jobs.
9. Existan endpoints para consultar candles por instrumentId, timeframe y rango de fechas.
10. Swagger documente todo.
11. README tenga ejemplos funcionales.
12. Tests básicos pasen.
13. El sistema siga sin ejecutar operaciones reales.
14. La arquitectura siga desacoplada y preparada para futuros providers.

NO HACER EN ESTE SPRINT

No implementar:
- Backtesting.
- Estrategia EMA.
- Indicadores técnicos.
- IA.
- Paper trading automático.
- MT5.
- Broker execution.
- Live trading.
- Dashboard.
- WebSockets.

ENTREGABLE FINAL

Implementa todos los archivos necesarios respetando la estructura actual del proyecto.

Después de implementar, explícame:

1. Qué archivos creaste o modificaste.
2. Qué migraciones agregaste.
3. Cómo probar la sincronización con BTCUSDT.
4. Cómo verificar que no hay duplicados.
5. Cómo consultar las velas guardadas.
6. Qué queda listo para Sprint 3.