# INVERSIONES MT5 Worker

Worker FastAPI para integrar MetaTrader 5 en modo seguro.

Por defecto:

- `ENABLE_LIVE_TRADING=false`
- `MT5_DRY_RUN=true`
- `POST /mt5/orders/place` no ejecuta orden real.

## Ejecutar local

```bash
cd services/mt5-worker
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8010
```

Para conexion real al terminal MT5 en un entorno compatible, instala el paquete oficial aparte:

```bash
pip install MetaTrader5
```

## Variables

```bash
ENABLE_LIVE_TRADING=false
MT5_DRY_RUN=true
MT5_WORKER_API_KEY=
MT5_LOGIN=
MT5_PASSWORD=
MT5_SERVER=
MT5_TERMINAL_PATH=
```

Si `MT5_WORKER_API_KEY` tiene valor, todas las rutas salvo `/health` requieren el header
`X-API-Key` con ese secreto. Usalo junto con HTTPS y firewall/IP allowlist cuando el worker viva en
un VPS Windows externo.

## Limitacion Docker/macOS

El paquete `MetaTrader5` necesita un terminal MT5 instalado y una sesion accesible por el runtime.
En macOS/Linux Docker normalmente no hay wheel compatible del paquete oficial, asi que el contenedor
queda para health, validacion de contratos y dry-run. Para leer cuenta/simbolos/precios reales, usa
Windows/VPS o un entorno donde `pip install MetaTrader5` funcione y el terminal MT5 este disponible.

## Pruebas rapidas

```bash
curl http://localhost:8010/health
curl http://localhost:8010/mt5/account
curl http://localhost:8010/mt5/symbols
curl http://localhost:8010/mt5/prices/XAUUSD
curl -X POST http://localhost:8010/mt5/orders/dry-run \
  -H 'Content-Type: application/json' \
  -d '{"symbol":"XAUUSD","direction":"BUY","volume":0.01,"entryPrice":2320.35,"stopLoss":2315,"takeProfit":2330}'
```
