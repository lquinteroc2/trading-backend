# Pendiente MT5 para produccion

Sprint 13 queda listo en modo seguro para desarrollo local:

- `mt5-worker` levanta en Docker.
- `health` funciona.
- `orders/dry-run` funciona.
- `orders/place` queda bloqueado.
- El backend registra logs y simulaciones.
- No se ejecutan ordenes reales.

## Limitacion actual

El paquete oficial `MetaTrader5` no funciona bien dentro de Docker Linux/macOS porque necesita un
terminal MetaTrader 5 instalado y accesible desde el mismo entorno donde corre Python.

Por eso, en Mac/Docker no se deben esperar datos reales de:

- `GET /mt5/account`
- `GET /mt5/symbols`
- `GET /mt5/prices/:symbol`

## Arquitectura esperada para produccion

El usuario final no instala MetaTrader 5. El front web o app movil siempre llama al backend.

```text
Frontend web / app movil
-> Backend NestJS en Google Cloud
-> mt5-worker en Windows VPS
-> Terminal MetaTrader 5 instalado y logueado
-> Broker
```

## Pendiente antes de habilitar lectura MT5 real

1. Crear una VM/VPS Windows.
2. Instalar MetaTrader 5.
3. Iniciar sesion en cuenta demo.
4. Instalar Python 3.11.
5. Instalar dependencias del worker:

```bash
cd services/mt5-worker
pip install -r requirements.txt
pip install MetaTrader5
```

6. Correr el worker en Windows:

```bash
uvicorn app.main:app --host 0.0.0.0 --port 8010
```

7. Configurar el backend en Google Cloud:

```env
MT5_WORKER_BASE_URL=http://IP_O_DOMINIO_DEL_WINDOWS_VPS:8010
ENABLE_LIVE_TRADING=false
MT5_DRY_RUN=true
```

## Seguridad minima requerida

Antes de exponer el worker MT5 fuera de una red local:

- No dejar `mt5-worker` abierto publicamente sin autenticacion.
- Permitir acceso solo desde la IP/red del backend.
- Usar HTTPS o red privada/VPN.
- Agregar API key interna o mTLS entre backend y worker.
- Mantener `ENABLE_LIVE_TRADING=false` y `MT5_DRY_RUN=true` hasta Sprint 14+.

## Pendiente para Sprint 14+

- Autenticacion interna backend -> mt5-worker.
- Healthcheck autenticado.
- Reconciliacion de estado del terminal MT5.
- Lectura real de cuenta/simbolos/precios desde Windows.
- Politica formal para habilitar live trading, con aprobaciones y auditoria.
- Mantener paper trading como flujo principal hasta aprobar ejecucion real.
