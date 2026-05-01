Actúa como arquitecto senior backend experto en NestJS, BullMQ, Redis, PostgreSQL, Prisma, arquitectura hexagonal, sistemas event-driven, trading algorítmico y procesamiento distribuido.

Ya completé:

SPRINT 1:
- Backend NestJS completo.
- Arquitectura hexagonal.
- PostgreSQL + Prisma.
- Redis + BullMQ base.
- Auth.
- Instrumentos.
- Candles.
- Señales.
- Agentes base.
- Riesgo.
- Paper trading base.

SPRINT 2:
- Ingesta de datos históricos.
- Binance provider.
- Sync candles.
- Prevención de duplicados.
- Sync logs.

SPRINT 3:
- Worker Python con FastAPI.
- Indicadores técnicos: EMA20, EMA50, EMA200, RSI, ATR.
- Endpoint /technical-analysis/analyze.
- Integración backend → Python worker.
- Guardado de resultados en agent_decisions.

OBJETIVO DEL SPRINT 4

Convertir el análisis técnico en un proceso automático basado en eventos y colas usando BullMQ.

El sistema debe:
1. Detectar cuando hay nuevas velas.
2. Encolar análisis técnico automáticamente.
3. Procesar el job en segundo plano.
4. Llamar al worker Python.
5. Guardar el resultado en agent_decisions.
6. Manejar errores y retries.

Este sprint NO debe:
- Generar señales todavía.
- Hacer backtesting.
- Ejecutar trades.
- Integrar broker.
- Implementar IA.
- Hacer lógica compleja de estrategia.

ARQUITECTURA OBJETIVO

Flujo:

NEW CANDLE →
EVENT (CANDLE_CLOSED) →
QUEUE (technical-analysis-queue) →
PROCESSOR →
PYTHON WORKER →
RESULT →
SAVE agent_decisions

STACK OBLIGATORIO

- NestJS
- BullMQ
- Redis
- Prisma
- PostgreSQL
- Axios/HTTP client
- Logger estructurado

MÓDULOS A IMPLEMENTAR

1. Event System interno

Crear sistema simple de eventos (no Kafka, no overengineering).

Crear eventos:

- CANDLE_CREATED
- CANDLE_CLOSED

Trigger:
Cuando se guarda una vela nueva en MarketData module.

IMPORTANTE:
No modificar crud existente de forma destructiva.

Agregar en servicio de candles:

afterCreateCandle(candle):
→ emitir evento CANDLE_CLOSED

2. Technical Analysis Queue

Crear cola:

technical-analysis-queue

Job name:
technical-analysis.analyze

Payload:

{
  "instrumentId": "uuid",
  "symbol": "BTCUSDT",
  "timeframe": "M15",
  "candleTimestamp": "2024-01-01T00:00:00.000Z"
}

Config:
- attempts: 3
- backoff: exponential
- removeOnComplete: true
- removeOnFail: false

3. Queue Producer

Cuando ocurre CANDLE_CLOSED:

Debe encolar automáticamente:

enqueueTechnicalAnalysis({
  instrumentId,
  timeframe,
  symbol
})

IMPORTANTE:
No disparar 1000 jobs por sync masivo.

Regla:
- Solo encolar cuando:
  - Es vela nueva en tiempo real
  O
  - Sync manual con flag triggerAnalysis=true

Agregar protección:
- debounce por symbol + timeframe
- evitar duplicados de job en corto tiempo

4. Queue Processor

Crear processor:

TechnicalAnalysisProcessor

Debe:

1. Recibir job.
2. Obtener últimas N velas desde DB (mínimo 200, ideal 500–1000).
3. Validar cantidad suficiente.
4. Llamar al Python worker.
5. Recibir resultado.
6. Guardar AgentDecision.
7. Loggear resultado.

Estructura:

process(job):
  → getCandles()
  → callPythonWorker()
  → saveAgentDecision()
  → return result

5. Integración con Python Worker

Reutilizar:

PythonTechnicalAnalysisProvider

Debe:
- Manejar timeout.
- Manejar error HTTP.
- Retry controlado.

Timeout recomendado:
- 5s a 10s máximo.

6. Persistencia en agent_decisions

Cada ejecución debe guardar:

- agentType: TECHNICAL
- instrumentId
- decision: APPROVE | WAIT | REJECT
- confidenceScore
- reasoning
- metadata:
  {
    indicators,
    rawResponse,
    candlesAnalyzed,
    timeframe
  }

Agregar campo si no existe:
- executionSource: "QUEUE" | "MANUAL"

7. Logging profesional

Usar logger estructurado.

Loggear:

- job start
- job success
- job failure
- retries
- tiempo de ejecución
- errores del worker

Formato:

{
  "event": "technical_analysis_job",
  "status": "SUCCESS",
  "symbol": "BTCUSDT",
  "timeframe": "M15",
  "durationMs": 1200
}

8. Error Handling

Casos:

- Menos de 200 velas → FAIL controlado (no retry)
- Error HTTP → retry
- Timeout → retry
- Error parsing → fail

Clasificar errores:
- retryable
- non-retryable

9. Endpoint manual (debug)

Mantener:

POST /agents/technical/analyze

Agregar:

POST /agents/technical/analyze/enqueue

Debe:
- Encolar job manualmente
- Retornar jobId

10. Endpoint de jobs

GET /queues/technical-analysis

Debe mostrar:
- jobs activos
- jobs fallidos
- jobs completados

(O usar Bull dashboard si prefieres)

11. Configuración

Agregar en .env:

TECHNICAL_ANALYSIS_QUEUE_CONCURRENCY=5
TECHNICAL_ANALYSIS_CANDLES_LIMIT=500
TECHNICAL_ANALYSIS_MIN_CANDLES=200
TECHNICAL_ANALYSIS_TIMEOUT_MS=8000

12. Docker

Asegurar:

backend → puede hablar con Redis
backend → puede hablar con worker Python

No crear contenedor nuevo aquí (ya existe worker).

13. Tests

Crear tests para:

Queue Producer:
- Encola correctamente.
- No encola duplicados.

Processor:
- Falla si no hay suficientes velas.
- Llama provider correctamente.
- Guarda agent_decision.

Error handling:
- Retry en error HTTP.
- No retry en error de datos.

14. README

Actualizar con:

- Cómo funciona el flujo automático.
- Cómo encolar manualmente.
- Cómo ver logs.
- Cómo simular nueva vela.
- Cómo verificar agent_decisions.

Ejemplo:

1. Hacer sync de velas.
2. Insertar nueva vela manual.
3. Ver que se dispara análisis automáticamente.

CRITERIOS DE ACEPTACIÓN

El Sprint 4 está completo cuando:

1. Existe cola technical-analysis-queue.
2. Se encola job automáticamente al crear nueva vela.
3. El job se procesa correctamente.
4. El processor obtiene velas desde DB.
5. El processor llama al worker Python.
6. El resultado se guarda en agent_decisions.
7. Existen retries en errores HTTP.
8. No hay duplicación de jobs innecesaria.
9. Existen logs claros.
10. Endpoint manual enqueue funciona.
11. Tests básicos pasan.
12. No se generan señales todavía.
13. No se ejecuta ningún trade.

NO HACER

No implementar:
- Estrategia de señales.
- Backtesting.
- Risk agent avanzado.
- Supervisor agent.
- Ejecución de trades.
- IA.
- MT5.
- WebSockets.
- Dashboard.

ENTREGABLE FINAL

Implementa todo el sistema de colas completo.

Luego explícame:

1. Cómo fluye el evento desde candle → queue → worker.
2. Cómo probarlo paso a paso.
3. Cómo ver los jobs en ejecución.
4. Cómo forzar errores y ver retries.
5. Qué queda listo para Sprint 5.






Actúa como arquitecto senior backend experto en NestJS, arquitectura hexagonal, sistemas event-driven, trading algorítmico, BullMQ, PostgreSQL, Prisma y diseño de estrategias cuantitativas.

Ya completé:

SPRINT 1:
- Dominio base de trading.
- Candles, instruments, signals, agents, risk, paper trading base.

SPRINT 2:
- Ingesta de datos históricos desde Binance.
- Persistencia de velas sin duplicados.

SPRINT 3:
- Worker Python con indicadores técnicos (EMA20, EMA50, EMA200, RSI, ATR).

SPRINT 4:
- Cola technical-analysis-queue con BullMQ.
- Procesamiento automático de análisis técnico.
- Persistencia en agent_decisions.

OBJETIVO DEL SPRINT 5

Implementar la primera estrategia real de generación de señales:
EMA Trend Strategy.

El sistema debe:
1. Leer el resultado del agente técnico.
2. Evaluar reglas de estrategia.
3. Generar señales BUY / SELL / NO_SIGNAL.
4. Guardar señales en base de datos.
5. Explicar cada señal.
6. Preparar integración futura con riesgo y supervisor.

Este sprint NO debe:
- Ejecutar trades.
- Hacer backtesting todavía.
- Conectar broker.
- Usar IA.
- Hacer multi-estrategia compleja.

ARQUITECTURA OBJETIVO

technical-analysis result →
strategy engine →
signal generation →
persist signals

REGLAS DE DISEÑO

1. La estrategia NO depende de Binance.
2. La estrategia NO depende del worker Python directamente.
3. Solo usa:
   - agent_decisions (technical)
   - candles si es necesario
4. Debe ser desacoplada y versionable.
5. Cada señal debe ser explicable.

MÓDULOS A IMPLEMENTAR

1. Strategy Domain

Crear módulo:

StrategyModule

Entidades:

Strategy:
- id
- name
- description
- status: ACTIVE | INACTIVE
- createdAt

StrategyVersion:
- id
- strategyId
- version
- parameters (JSON)
- isActive
- createdAt

Seed inicial:
- EMA_TREND_STRATEGY
- version: v1

2. Strategy Engine

Crear servicio:

StrategyEngineService

Responsabilidad:
- Ejecutar estrategias activas.
- Delegar a strategy implementations.

Interface:

IStrategy:
- evaluate(context): StrategyResult

3. Strategy Context

Crear DTO interno:

StrategyContext:
- instrumentId
- symbol
- timeframe
- technicalAnalysis (AgentDecision)
- latestCandle
- candles opcional

4. EMA Trend Strategy Implementation

Crear:

EmaTrendStrategyService

Reglas:

BUY si:
- EMA20 > EMA50 > EMA200
- RSI entre 45 y 70

SELL si:
- EMA20 < EMA50 < EMA200
- RSI entre 30 y 55

NO_SIGNAL si:
- EMAs no están alineadas
- RSI no confirma

Stop Loss:
- Usar ATR:
  SL = entryPrice - (ATR * 1.5) para BUY
  SL = entryPrice + (ATR * 1.5) para SELL

Take Profit:
- TP = entryPrice + (ATR * 3) para BUY
- TP = entryPrice - (ATR * 3) para SELL

ConfidenceScore:
- Base 50
- +20 si EMAs alineadas
- +15 si RSI confirma
- +10 si ATR es estable
- +5 si tendencia consistente con últimas velas

Limitar entre 0 y 100

5. Signal Entity (mejorar si es necesario)

Signal:
- id
- instrumentId
- strategyId
- timeframe
- direction: BUY | SELL | NONE
- entryPrice
- stopLoss
- takeProfit
- confidence
- status: CREATED | UNDER_REVIEW | APPROVED | REJECTED | EXPIRED
- reason (texto)
- createdAt

IMPORTANTE:
No usar EXECUTED todavía.

6. Signal Generation Flow

Crear flujo automático:

Cuando:
→ se guarda AgentDecision tipo TECHNICAL

Entonces:
→ evaluar estrategia

→ generar señal si aplica

Crear listener o hook:

onTechnicalAnalysisCompleted()

Debe:
1. Obtener AgentDecision
2. Validar confidence >= mínimo (ej: 50)
3. Construir StrategyContext
4. Ejecutar StrategyEngine
5. Si hay señal:
   - guardar en signals
6. Loggear

7. Cola opcional (recomendado)

Crear cola:

signal-generation-queue

Job:
signal.generate

Payload:
{
  "agentDecisionId": "uuid"
}

Processor:
- obtiene decision
- ejecuta estrategia
- guarda señal

8. Endpoint manual

POST /signals/generate

Body:
{
  "instrumentId": "uuid",
  "timeframe": "M15"
}

Debe:
- obtener último análisis técnico
- ejecutar estrategia
- retornar señal

9. Endpoint consulta

GET /signals

Query:
- instrumentId
- timeframe
- status
- from
- to

GET /signals/:id

10. Logging

Registrar:

- evaluación de estrategia
- señales generadas
- razones de no señal

Formato:

{
  "event": "signal_generation",
  "symbol": "BTCUSDT",
  "decision": "BUY",
  "confidence": 78
}

11. Validaciones

No generar señal si:
- confidence técnica < 50
- technicalBias = NEUTRAL
- faltan indicadores

Evitar duplicados:
- no crear múltiples señales para misma vela

Constraint recomendado:
- unique por (instrumentId, timeframe, candleTimestamp)

12. Tests

Strategy:
- genera BUY correctamente
- genera SELL correctamente
- evita señal en mercado lateral

Signal Service:
- guarda señal correctamente
- evita duplicados

Integration:
- recibe agent_decision → genera señal

13. Config

.env:

SIGNAL_MIN_CONFIDENCE=50
SIGNAL_ATR_SL_MULTIPLIER=1.5
SIGNAL_ATR_TP_MULTIPLIER=3

14. README

Agregar:

- cómo generar señal manual
- cómo ver señales
- ejemplo real con BTCUSDT
- flujo completo:
  candle → análisis → señal

CRITERIOS DE ACEPTACIÓN

El Sprint 5 está completo cuando:

1. Existe StrategyModule.
2. Existe StrategyEngine desacoplado.
3. Existe EMA Trend Strategy.
4. Se generan señales BUY/SELL.
5. Se evita señal en mercado lateral.
6. Se calcula SL y TP con ATR.
7. Se guarda señal en DB.
8. Cada señal tiene explicación.
9. No se generan duplicados.
10. Endpoint manual funciona.
11. Señales se generan automáticamente desde análisis técnico.
12. Tests pasan.

NO HACER

No implementar:
- Backtesting
- Risk agent avanzado
- Supervisor agent
- Ejecución de trades
- IA
- Multi-estrategia compleja
- Dashboard
- WebSockets

ENTREGABLE FINAL

Implementa todo el sistema de generación de señales.

Luego explícame:

1. Cómo fluye desde agent_decision → signal.
2. Cómo probar con BTCUSDT.
3. Cómo evitar señales duplicadas.
4. Cómo ajustar parámetros de estrategia.
5. Qué queda listo para Sprint 6 (backtesting).