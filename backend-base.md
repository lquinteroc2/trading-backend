Actúa como arquitecto senior backend experto en NestJS, TypeScript, arquitectura hexagonal, sistemas financieros, trading algorítmico, IA aplicada, colas, PostgreSQL y Redis.

Necesito crear desde cero el backend del proyecto INVERSIONES.

CONTEXTO DEL PROYECTO
INVERSIONES es una plataforma privada de trading inteligente para uso personal. El objetivo inicial no es vender a terceros, sino construir una infraestructura privada para analizar mercados financieros, generar señales, validar estrategias, hacer paper trading, gestionar riesgo y preparar una futura automatización con brokers.

Mercados objetivo iniciales:
- Forex
- XAUUSD / Oro
- Nasdaq
- SP500
- Criptomonedas
- Commodities

El sistema debe estar diseñado para crecer luego hacia una plataforma comercial SaaS, pero el Sprint 1 se enfoca únicamente en el backend base del modelo privado.

STACK OBLIGATORIO
- NestJS
- TypeScript
- PostgreSQL
- Prisma ORM
- Redis
- BullMQ
- Docker Compose
- Arquitectura hexagonal / clean architecture
- Validación con class-validator y class-transformer
- Configuración por variables de entorno
- Swagger/OpenAPI
- Jest para testing básico

OBJETIVO DEL SPRINT 1
Construir la base sólida del backend para que luego se puedan conectar agentes de IA, bots, backtesting, broker execution y dashboard.

Este Sprint 1 NO debe ejecutar operaciones reales todavía.
Debe preparar la arquitectura para:
- Registrar instrumentos financieros
- Registrar velas OHLCV
- Crear señales de trading
- Crear decisiones de agentes
- Gestionar riesgo básico
- Registrar operaciones simuladas/paper trading
- Dejar preparado el sistema para workers y procesos automáticos

MÓDULOS DEL SPRINT 1

1. Core / Shared
Crear estructura base:
- src/
  - modules/
  - shared/
  - config/
  - database/
  - queues/
  - common/
  - health/

Debe incluir:
- ConfigService tipado
- Variables de entorno
- Manejo global de errores
- DTO validation pipe global
- Swagger
- Health check endpoint

2. Auth básico interno
Crear un auth simple para uso privado:
- Login con email/password
- JWT
- Roles: ADMIN, TRADER, VIEWER
- Guards básicos
- No necesito OAuth en Sprint 1

Entidades:
- User
- Role

Endpoints:
- POST /auth/login
- GET /auth/me

3. Instruments Module
Representa activos financieros como:
- XAUUSD
- EURUSD
- NAS100
- BTCUSDT

Entidad:
Instrument:
- id
- symbol
- name
- marketType: FOREX | CRYPTO | INDEX | COMMODITY | STOCK
- brokerSymbol
- isActive
- createdAt
- updatedAt

Endpoints:
- POST /instruments
- GET /instruments
- GET /instruments/:id
- PATCH /instruments/:id
- DELETE lógico /instruments/:id

4. Market Data Module
Debe permitir guardar velas OHLCV.

Entidad:
MarketCandle:
- id
- instrumentId
- timeframe: M1 | M5 | M15 | M30 | H1 | H4 | D1
- open
- high
- low
- close
- volume
- timestamp
- source
- createdAt

Endpoints:
- POST /market-data/candles
- POST /market-data/candles/bulk
- GET /market-data/candles?instrumentId=&timeframe=&from=&to=

Importante:
- Validar que no se dupliquen velas por instrumentId + timeframe + timestamp.
- Usar índices en PostgreSQL.

5. Trading Signals Module
Debe registrar señales generadas por el sistema.

Entidad:
TradingSignal:
- id
- instrumentId
- direction: BUY | SELL | NEUTRAL
- entryPrice
- stopLoss
- takeProfit
- confidenceScore: 0-100
- status: PENDING | APPROVED | REJECTED | EXECUTED | EXPIRED
- sourceAgent: TECHNICAL | FUNDAMENTAL | RISK | SUPERVISOR | MANUAL
- reasoning
- createdAt
- expiresAt

Endpoints:
- POST /signals
- GET /signals
- GET /signals/:id
- PATCH /signals/:id/status

6. Agents Module
Preparar estructura para agentes inteligentes.

Agentes conceptuales:
- TechnicalAgent
- FundamentalAgent
- RiskAgent
- ExecutionAgent
- SupervisorAgent

En Sprint 1 no necesito IA real todavía.
Necesito interfaces, contratos y casos de uso preparados.

Crear:
- AgentDecision entity
- AgentType enum
- AgentDecisionStatus enum

Entidad:
AgentDecision:
- id
- agentType: TECHNICAL | FUNDAMENTAL | RISK | EXECUTION | SUPERVISOR
- instrumentId
- signalId opcional
- decision: APPROVE | REJECT | WAIT | MODIFY
- confidenceScore
- reasoning
- metadata JSON
- createdAt

Endpoints:
- POST /agents/decisions
- GET /agents/decisions
- GET /agents/decisions/:id

Crear interfaces:
- IAgent
- ITechnicalAgent
- IFundamentalAgent
- IRiskAgent
- IExecutionAgent
- ISupervisorAgent

7. Risk Management Module
Debe calcular riesgo básico de una operación.

Entrada:
- accountBalance
- riskPercent
- entryPrice
- stopLoss
- instrumentId

Salida:
- riskAmount
- stopLossDistance
- positionSize
- estimatedLoss
- riskRewardRatio

Endpoint:
- POST /risk/calculate-position-size

Crear servicio desacoplado:
- CalculatePositionSizeUseCase

8. Paper Trading Module
Registrar operaciones simuladas.

Entidad:
PaperTrade:
- id
- signalId
- instrumentId
- direction: BUY | SELL
- entryPrice
- stopLoss
- takeProfit
- positionSize
- status: OPEN | CLOSED | CANCELLED
- openedAt
- closedAt
- closePrice
- pnl
- pnlPercent
- result: WIN | LOSS | BREAKEVEN | OPEN

Endpoints:
- POST /paper-trades
- GET /paper-trades
- GET /paper-trades/:id
- PATCH /paper-trades/:id/close

9. Queues / Workers
Configurar BullMQ con Redis.

Crear colas base:
- market-data-queue
- signal-generation-queue
- agent-decision-queue
- paper-trading-queue

En Sprint 1 solo dejar workers base con logs, sin lógica pesada.

10. Database
Usar Prisma.

Crear:
- schema.prisma completo
- migrations
- seed básico con:
  - usuario admin
  - instrumentos iniciales:
    - XAUUSD
    - EURUSD
    - NAS100
    - BTCUSDT

11. Docker
Crear docker-compose.yml con:
- postgres
- redis
- backend

Crear:
- .env.example
- README.md con instrucciones para correr el proyecto

12. Testing mínimo
Crear tests unitarios para:
- Risk calculation
- Instruments service
- Signals service

13. Calidad de código
Configurar:
- ESLint
- Prettier
- tsconfig correcto
- scripts npm:
  - start:dev
  - build
  - test
  - prisma:migrate
  - prisma:generate
  - prisma:seed

CRITERIOS DE ACEPTACIÓN
El Sprint 1 estará completo cuando:

1. El backend levante con Docker Compose.
2. PostgreSQL y Redis funcionen correctamente.
3. Swagger esté disponible.
4. Se pueda crear un usuario admin por seed.
5. Se pueda hacer login y obtener JWT.
6. Se puedan crear/listar instrumentos.
7. Se puedan guardar velas OHLCV.
8. Se puedan crear señales de trading.
9. Se puedan registrar decisiones de agentes.
10. Se pueda calcular tamaño de posición.
11. Se puedan crear y cerrar paper trades.
12. Existan colas BullMQ configuradas.
13. Existan pruebas básicas.
14. El README explique cómo correr todo.

IMPORTANTE
No quiero una arquitectura improvisada.
Quiero una base profesional, escalable y mantenible.

Usa arquitectura hexagonal:
- domain
- application
- infrastructure
- presentation

Cada módulo debe separar:
- entities
- repositories interfaces
- use cases
- controllers
- DTOs
- persistence/prisma repositories

No mezcles lógica de negocio en controllers.
No acoples el dominio a Prisma.
No ejecutes operaciones reales.
No integres brokers todavía.
No uses IA real todavía.
Solo deja contratos e interfaces preparados.

ENTREGABLE FINAL
Genera el proyecto completo con todos los archivos necesarios.
Después explícame:
1. Estructura creada.
2. Cómo correr el backend.
3. Cómo ejecutar migraciones.
4. Cómo probar endpoints.
5. Qué queda listo para Sprint 2.