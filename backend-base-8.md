Actúa como arquitecto senior backend y quant engineer experto en NestJS, arquitectura hexagonal, sistemas event-driven, BullMQ, PostgreSQL, Prisma y diseño de sistemas de trading automatizado.

Ya completé:

SPRINT 1:
- Dominio base (candles, signals, agents, etc).

SPRINT 2:
- Ingesta de datos históricos.

SPRINT 3:
- Worker Python de análisis técnico.

SPRINT 4:
- Cola de análisis técnico.

SPRINT 5:
- StrategyEngine y generación de señales.

SPRINT 6:
- Backtesting engine.

SPRINT 7:
- Risk Agent.

SPRINT 8:
- Paper Trading Engine (cuenta simulada, trades, pnl, cierre por SL/TP).

OBJETIVO DEL SPRINT 9

Implementar el Agente Supervisor.

Este agente es el responsable de:
1. Tomar la decisión final de operar o no.
2. Recibir:
   - Señal (strategy)
   - Evaluación de riesgo
   - Estado de cuenta
3. Decidir:
   - OPERATE
   - WAIT
   - BLOCK
4. Controlar condiciones globales del sistema.

IMPORTANTE:
Ningún trade simulado debe ejecutarse sin aprobación del Supervisor.

ARQUITECTURA OBJETIVO

signal →
risk evaluation →
supervisor →
decision →
paper trading (solo si OPERATE)

PRINCIPIOS CLAVE

1. El supervisor NO genera señales.
2. El supervisor NO calcula indicadores.
3. Solo toma decisiones basadas en inputs existentes.
4. Debe ser explicable.
5. Debe ser configurable.
6. Debe registrar TODAS sus decisiones.

MÓDULOS A IMPLEMENTAR

1. Supervisor Decision Entity

Crear:

SupervisorDecision:
- id
- signalId
- decision: OPERATE | WAIT | BLOCK
- reason
- confidence
- metadata JSON
- createdAt

También persistir en agent_decisions con:
- agentType: SUPERVISOR

2. SupervisorAgentService

Crear servicio:

SupervisorAgentService

Método principal:

decide(signal, riskDecision, accountState)

3. Inputs del Supervisor

Signal:
- direction
- confidence
- entryPrice
- stopLoss
- takeProfit

RiskDecision:
- decision (APPROVED / REJECTED)
- positionSize
- riskRewardRatio

AccountState:
- balance
- equity
- openTrades
- dailyPnL

4. Reglas del Supervisor

OPERATE solo si:

- signal.confidence >= 70
- riskDecision = APPROVED
- no existe trade abierto en el mismo symbol
- openTrades < maxOpenTrades
- sistema en modo PAPER_TRADING
- no se ha alcanzado maxDailyDrawdown

WAIT si:
- señal válida pero no óptima
- confidence entre 50 y 69
- mercado dudoso

BLOCK si:
- riskDecision = REJECTED
- confidence < 50
- ya hay trade abierto en ese símbolo
- drawdown diario excedido
- sistema en modo SAFE o PAUSED

5. System Mode

Crear configuración global:

SystemMode:
- PAPER_TRADING
- SAFE_MODE
- PAUSED

Crear tabla o config:

SystemConfig:
- mode
- killSwitch: boolean

Reglas:
- Si killSwitch = true → BLOCK todo
- Si mode != PAPER_TRADING → no ejecutar trades

6. Integración con flujo

Trigger:

Cuando:
→ existe Signal
→ existe RiskDecision APPROVED o REJECTED

Entonces:
→ ejecutar SupervisorAgent

Opciones:

A. Directo
B. Cola (recomendado)

Crear cola:

supervisor-decision-queue

Job:
supervisor.decide

Payload:
{
  "signalId": "uuid"
}

Processor:
1. obtener signal
2. obtener risk decision
3. obtener account state
4. ejecutar SupervisorAgent
5. guardar decision
6. si decision = OPERATE → encolar paper trade

7. Integración con Paper Trading

Solo si:

decision == OPERATE

→ encolar:

paper-trade.open

IMPORTANTE:
Eliminar cualquier apertura directa de trades desde signals o risk.

TODO trade debe pasar por Supervisor.

8. Endpoints

POST /agents/supervisor/decide

Body:
{
  "signalId": "uuid"
}

GET /agents/supervisor/decisions

GET /agents/supervisor/decisions/:id

GET /system/config

PATCH /system/config

Body:
{
  "mode": "PAPER_TRADING",
  "killSwitch": false
}

9. Validaciones

- signal debe existir
- riskDecision debe existir
- no duplicar decisiones para mismo signal
- no ejecutar si killSwitch activo

10. Logging

Registrar:

{
  "event": "supervisor_decision",
  "signalId": "...",
  "decision": "OPERATE",
  "confidence": 82,
  "reason": "All conditions satisfied"
}

11. Tests

Supervisor rules:
- aprueba operación válida
- bloquea si riesgo rechazado
- bloquea si ya hay trade abierto
- bloquea si killSwitch activo
- espera si confidence media

Integration:
- signal → risk → supervisor → paper trade

12. Config

.env:

SUPERVISOR_MIN_CONFIDENCE=70
SUPERVISOR_MAX_OPEN_TRADES=1
SUPERVISOR_MAX_DRAWDOWN=0.02

13. README

Agregar:

- flujo completo actualizado
- explicación del supervisor
- ejemplos:
  - señal aprobada
  - señal bloqueada
- cómo activar kill switch
- cómo probar flujo completo

CRITERIOS DE ACEPTACIÓN

Sprint 9 completo cuando:

1. Existe SupervisorAgentService.
2. Se toman decisiones OPERATE / WAIT / BLOCK.
3. No se ejecuta trade sin supervisor.
4. Kill switch funciona.
5. System mode funciona.
6. Se registra decisión en DB.
7. Se integra con paper trading.
8. Tests pasan.

NO HACER

No implementar:
- broker real
- IA
- dashboard
- WebSockets
- MT5
- live trading

ENTREGABLE FINAL

Implementa el Supervisor Agent completo.

Luego explícame:

1. Cómo fluye signal → risk → supervisor → trade.
2. Cómo probar un flujo completo.
3. Cómo bloquear todo el sistema con kill switch.
4. Qué queda listo para Sprint 10 (dashboard).