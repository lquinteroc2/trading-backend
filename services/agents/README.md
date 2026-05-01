# Technical Agent Worker

Worker Python/FastAPI para analisis tecnico inicial de INVERSIONES.

## Instalar dependencias

```bash
cd services/agents
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

## Ejecutar local

```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

Health check:

```bash
curl http://localhost:8000/health
```

## Tests

```bash
pytest
```

## Endpoint

```bash
curl -X POST http://localhost:8000/technical-analysis/analyze \
  -H "Content-Type: application/json" \
  -d '{"symbol":"BTCUSDT","timeframe":"M15","candles":[]}'
```

El request real requiere al menos 200 velas OHLCV.
