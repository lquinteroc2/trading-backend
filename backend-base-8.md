Actúa como arquitecto senior backend y quant engineer experto en NestJS, arquitectura hexagonal, PostgreSQL, Prisma, BullMQ, Redis, trading algorítmico y simulación de ejecución.

Ya completé:
- Sprint 1: dominio base, candles, signals, agents, risk base, paper trading base.
- Sprint 2: ingesta histórica Binance.
- Sprint 3: worker Python de análisis técnico.
- Sprint 4: cola de análisis técnico.
- Sprint 5: generación de señales EMA Trend Strategy.
- Sprint 6: backtesting engine.
- Sprint 7: Risk Agent con evaluación de señales y agent_decisions tipo RISK.

OBJETIVO DEL SPRINT 8

Implementar el Paper Trading Engine completo.

El sistema debe:
1. Crear una cuenta simulada.
2. Ejecutar señales aprobadas por riesgo como trades simulados.
3. Monitorear nuevas velas.
4. Cerrar trades si toca Stop Loss o Take Profit.
5. Calcular PnL.
6. Actualizar balance/equity.
7. Registrar todo de forma auditable.

Este sprint NO debe:
- Conectarse a broker real.
- Ejecutar órdenes reales.
- Implementar supervisor final todavía.
- Implementar dashboard.
- Implementar IA.

ARQUITECTURA OBJETIVO

signal APPROVED by risk →
paper trading engine →
open simulated trade →
new candles →
check SL/TP →
close trade →
update account balance →
persist result

MÓDULOS A IMPLEMENTAR

1. PaperTradingAccount Entity

Crear o mejorar:

PaperTradingAccount:
- id
- name
- initialBalance
- balance
- equity
- currency: USD
- status: ACTIVE | INACTIVE
- createdAt
- updatedAt

Seed:
- DEFAULT_PAPER_ACCOUNT
- initialBalance: 10000

2. PaperTrade Entity

Crear o mejorar:

PaperTrade:
- id
- accountId
- signalId
- instrumentId
- direction: BUY | SELL
- entryPrice
- stopLoss
- takeProfit
- positionSize
- openedAt
- closedAt
- closePrice
- pnl
- pnlPercent
- result: WIN | LOSS | BREAKEVEN | OPEN
- status: OPEN | CLOSED | CANCELLED
- closeReason: STOP_LOSS | TAKE_PROFIT | MANUAL | SYSTEM

3. PaperTradingEngineService

Crear servicio principal:

PaperTradingEngineService

Métodos:
- openTradeFromSignal(signalId)
- closeTrade(tradeId, closePrice, closeReason)
- evaluateOpenTradesOnCandle(candle)
- recalculateAccountEquity(accountId)

4. Reglas para abrir trade

Solo abrir trade si:
- signal existe
- signal.status es APPROVED o UNDER_REVIEW con risk approval
- existe Risk AgentDecision APPROVED para signalId
- no existe trade abierto para el mismo instrumentId
- cuenta paper activa
- positionSize válido
- entryPrice, SL y TP válidos

Al abrir:
- crear PaperTrade en status OPEN
- usar positionSize de RiskAssessment / metadata del agent_decision RISK
- entryPrice = signal.entryPrice
- openedAt = now
- no modificar balance todavía, solo equity si aplica

5. Reglas para cerrar trade por vela

Para cada nueva vela:

Si trade BUY:
- Si candle.low <= stopLoss → cerrar en stopLoss con LOSS
- Si candle.high >= takeProfit → cerrar en takeProfit con WIN

Si trade SELL:
- Si candle.high >= stopLoss → cerrar en stopLoss con LOSS
- Si candle.low <= takeProfit → cerrar en takeProfit con WIN

Orden conservador:
- evaluar STOP_LOSS antes que TAKE_PROFIT si ambos ocurren en la misma vela.

6. Cálculo PnL

BUY:
pnl = (closePrice - entryPrice) * positionSize

SELL:
pnl = (entryPrice - closePrice) * positionSize

pnlPercent:
pnl / account.balance antes del cierre

Al cerrar:
- actualizar account.balance = account.balance + pnl
- actualizar equity
- guardar result

7. Integración con eventos/colas

Cuando se crea una nueva señal y riesgo aprueba:

Crear cola:
paper-trading-queue

Jobs:
- paper-trade.open
- paper-trade.evaluate-open-trades

Payload open:
{
  "signalId": "uuid",
  "accountId": "uuid"
}

Payload evaluate:
{
  "candleId": "uuid"
}

Cuando llega CANDLE_CLOSED:
- encolar evaluate-open-trades para esa vela.

8. Endpoints

POST /paper-trading/accounts
GET /paper-trading/accounts
GET /paper-trading/accounts/:id

POST /paper-trading/trades/open
Body:
{
  "signalId": "uuid",
  "accountId": "uuid"
}

PATCH /paper-trading/trades/:id/close
Body:
{
  "closePrice": 65000,
  "closeReason": "MANUAL"
}

GET /paper-trading/trades
Query:
- accountId
- instrumentId
- status
- result
- from
- to

GET /paper-trading/trades/:id

POST /paper-trading/evaluate-candle
Body:
{
  "candleId": "uuid"
}

9. Auditoría

Cada apertura y cierre debe crear log estructurado:

{
  "event": "paper_trade_opened",
  "signalId": "...",
  "tradeId": "...",
  "entryPrice": 65000,
  "positionSize": 0.12
}

{
  "event": "paper_trade_closed",
  "tradeId": "...",
  "result": "WIN",
  "pnl": 250,
  "balanceAfter": 10250
}

10. Validaciones

- No abrir trade duplicado para mismo signalId.
- No abrir más de un trade abierto por instrumentId.
- No cerrar trade ya cerrado.
- No cerrar con precio inválido.
- No abrir si falta risk approval.
- No abrir si no hay cuenta activa.

11. Tests

Crear tests para:

PaperTradingEngine:
- abre trade correctamente
- no abre trade sin risk approval
- no abre trade duplicado
- cierra BUY por SL
- cierra BUY por TP
- cierra SELL por SL
- cierra SELL por TP
- calcula PnL correctamente
- actualiza balance correctamente

Processor:
- paper-trade.open procesa job
- evaluate-open-trades cierra trades según vela

Controller:
- endpoints validan DTOs
- endpoints devuelven respuesta correcta

12. Config

Agregar .env:

PAPER_TRADING_DEFAULT_BALANCE=10000
PAPER_TRADING_MAX_OPEN_TRADES_PER_SYMBOL=1
PAPER_TRADING_ENABLED=true

13. README

Actualizar README con:

- cómo crear cuenta paper
- cómo abrir trade desde una señal aprobada
- cómo evaluar trades con una vela
- cómo consultar balance
- cómo revisar trades abiertos/cerrados

CRITERIOS DE ACEPTACIÓN

Sprint 8 completo cuando:

1. Existe cuenta paper trading.
2. Se puede abrir trade simulado desde una señal aprobada por riesgo.
3. Se rechaza apertura sin aprobación de riesgo.
4. Se evita trade duplicado.
5. Nueva vela evalúa trades abiertos.
6. Trades cierran por SL/TP.
7. PnL se calcula correctamente.
8. Balance se actualiza correctamente.
9. Todo queda persistido.
10. Cola paper-trading-queue funciona.
11. Tests pasan.
12. No hay ejecución real.

NO HACER

No implementar:
- broker real
- live trading
- supervisor agent completo
- dashboard
- IA
- WebSockets
- MT5

ENTREGABLE FINAL

Implementa el Paper Trading Engine completo.

Luego explícame:

1. Cómo fluye signal → risk approval → paper trade.
2. Cómo se abre una operación simulada.
3. Cómo se cierra por SL/TP.
4. Cómo se calcula PnL y balance.
5. Qué queda listo para Sprint 9.