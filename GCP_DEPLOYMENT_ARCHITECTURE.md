# GCP Deployment Architecture - Trading Backend

## Objetivo

Este documento define como desplegar `trading-backend` en Google Cloud para ambientes `dev` y
`prod`, que servicios de GCP se deben usar, que limitaciones existen por MT5 y que componentes deben
cotizarse antes de salir a produccion.

El backend no es solo una API HTTP. Tambien corre procesadores BullMQ, se conecta a PostgreSQL,
Redis, workers Python y eventualmente a MT5. Por eso el deployment debe cubrir:

- API NestJS.
- Procesadores de colas BullMQ.
- Worker Python de analisis tecnico.
- Worker MT5 en modo dry-run o puente hacia un entorno Windows/VPS.
- PostgreSQL administrado.
- Redis administrado.
- Secretos, logs, metricas, build y despliegue.

## Resumen Ejecutivo

Arquitectura recomendada:

```text
GitHub
  -> GitHub Actions
  -> Artifact Registry
  -> Cloud Run: trading-backend-api
  -> Cloud Run: technical-agent-worker
  -> Cloud Run: mt5-worker-dry-run, opcional
  -> Cloud SQL for PostgreSQL
  -> Memorystore for Redis
  -> Secret Manager
  -> Cloud Logging / Monitoring
  -> Cloud Scheduler, opcional para jobs operativos
  -> Compute Engine Windows VM o VPS externo, solo si se usara MT5 real
```

Para `dev`, se puede usar una version mas barata con instancias pequenas, Redis Basic, Cloud Run con
min instances bajo y live trading apagado.

Para `prod`, se recomienda separar recursos por ambiente, usar Redis Standard, Cloud SQL con backups,
Cloud Run con al menos una instancia para que BullMQ procese continuamente, secretos separados y
alertas.

## Servicios GCP a Cotizar

### Obligatorios

1. **Cloud Run**
   - `trading-backend-api`: NestJS API y procesadores BullMQ.
   - `technical-agent-worker`: FastAPI para analisis tecnico.
   - `mt5-worker-dry-run`: opcional si solo se requiere dry-run/contratos desde Linux.

2. **Artifact Registry**
   - Repositorio Docker para imagenes:
     - backend Node.
     - technical-agent worker.
     - mt5-worker, si aplica.

3. **Cloud SQL for PostgreSQL**
   - Base de datos principal Prisma.
   - Una instancia para `dev` y otra para `prod`, o al menos bases separadas si el presupuesto manda.

4. **Memorystore for Redis**
   - Redis administrado para BullMQ.
   - Necesario porque el backend usa colas para analisis tecnico, senales, riesgo, supervisor, broker
     y paper trading.

5. **Secret Manager**
   - `DATABASE_URL`.
   - `JWT_SECRET`.
   - `JWT_REFRESH_SECRET`.
   - `REDIS_PASSWORD`, si se usa auth.
   - `MT5_LOGIN`, `MT5_PASSWORD`, `MT5_SERVER`, si aplica.
   - URLs internas de workers y cualquier credencial futura.

6. **Cloud Logging y Cloud Monitoring**
   - Logs de API, workers, errores y eventos de trading.
   - Alertas para fallos de deploy, errores 5xx, jobs fallidos, CPU/memoria y DB.

7. **Serverless VPC Access Connector**
   - Requerido para que Cloud Run alcance Memorystore Redis.
   - Tambien puede usarse para trafico privado hacia recursos internos.

### Recomendados

8. **Cloud Run Jobs**
   - Ejecutar `prisma migrate deploy`.
   - Ejecutar seeds controlados cuando corresponda.
   - Evita correr migraciones dentro del arranque normal de la API.

9. **Cloud Scheduler**
   - Health checks operativos.
   - Jobs periodicos futuros, por ejemplo syncs programados o mantenimiento.

10. **Cloud NAT**
    - Solo si se fuerza salida por VPC y se necesita egress estable hacia internet, por ejemplo Binance
      o servicios externos.

11. **Load Balancer + Cloud Armor**
    - Recomendado en `prod` si se necesita dominio corporativo, WAF, IP fija o reglas de seguridad.
    - No es estrictamente necesario para empezar con Cloud Run directo.

12. **Error Reporting**
    - Complementa Cloud Logging para agrupar errores.

### MT5 Real

Cloud Run corre Linux containers. El paquete oficial `MetaTrader5` necesita un terminal MT5 instalado
y normalmente un entorno Windows compatible. Por eso:

- **Dry-run / contratos / health**: puede correr en Cloud Run como `mt5-worker-dry-run`.
- **MT5 real**: usar **Compute Engine Windows VM** o un **VPS Windows externo** con terminal MT5 y el
  worker FastAPI `services/mt5-worker`.

Para cotizacion de MT5 real incluir:

- Compute Engine Windows VM, si se decide ir full GCP.
- Disco persistente.
- IP estatica, si se requiere.
- Reglas de firewall.
- Costo de licencia Windows incluido en la VM.
- Operacion/monitoreo de terminal MT5.

## Ambientes

## Dev

Objetivo: barato, reproducible, suficiente para validar frontend, API, colas y workers.

Componentes:

- Cloud Run `trading-backend-dev`
  - Imagen del backend.
  - `ENABLE_LIVE_TRADING=false`.
  - `MT5_DRY_RUN=true`.
  - `NODE_ENV=production` o `development` segun politica de logs. Recomendado: `production` para
    parecerse a prod.
  - Min instances: `0` si no se necesitan colas siempre activas.
  - Min instances: `1` si se quiere que BullMQ procese jobs aun sin trafico HTTP.

- Cloud Run `technical-agent-dev`
  - Imagen `services/agents`.
  - Autenticacion interna, no publico a internet.

- Cloud Run `mt5-worker-dev`, opcional
  - Solo dry-run.
  - No usar para ejecucion real.

- Cloud SQL PostgreSQL dev
  - Instancia pequena.
  - Backups opcionales o retencion corta.

- Memorystore Redis dev
  - Basic tier.
  - Capacidad pequena.

- Secret Manager dev
  - Secretos con prefijo `trading-dev-`.

Notas:

- Si `min instances=0`, Cloud Run puede escalar a cero y los procesadores BullMQ no correran mientras
  no haya instancia viva.
- Para demo estable de colas, usar `min instances=1` y CPU siempre asignada.

## Prod

Objetivo: disponibilidad, seguridad, auditoria y separacion clara de secretos.

Componentes:

- Cloud Run `trading-backend-prod`
  - Min instances: `1` como minimo por BullMQ.
  - CPU always allocated: recomendado para procesar colas en background.
  - Concurrency moderada, por ejemplo 20-80 segun carga.
  - Memoria inicial sugerida: 1GiB o 2GiB.
  - CPU inicial sugerida: 1 vCPU.
  - Service account dedicada.

- Cloud Run `technical-agent-prod`
  - Privado, invocable solo por service account del backend.
  - Min instances: `0` o `1`, segun latencia requerida.
  - Memoria puede necesitar 512MiB-1GiB segun volumen de velas.

- MT5 real
  - Opcion A: Compute Engine Windows VM en GCP.
  - Opcion B: VPS Windows externo y endpoint privado/restringido.
  - Backend prod debe apuntar `MT5_WORKER_BASE_URL` a ese worker.
  - Mantener `ENABLE_LIVE_TRADING=false` hasta terminar pruebas demo y aprobacion operativa.

- Cloud SQL PostgreSQL prod
  - Backups automaticos.
  - Point-in-time recovery si el presupuesto lo permite.
  - Alta disponibilidad si el negocio lo requiere.
  - Storage autoscaling.

- Memorystore Redis prod
  - Standard tier recomendado.
  - Red privada via VPC connector.

- Secret Manager prod
  - Secretos con prefijo `trading-prod-`.
  - Rotacion documentada de JWT y credenciales MT5.

- Cloud Logging / Monitoring
  - Alertas minimas:
    - Cloud Run 5xx.
    - Cloud Run instance crashes.
    - Redis unavailable.
    - Cloud SQL CPU/storage/connections.
    - Jobs BullMQ fallidos, via logs.
    - Live execution failed/blocked, via logs.

## Importante: BullMQ en Cloud Run

El backend actual registra processors BullMQ dentro de la aplicacion Nest. Eso significa que la misma
instancia que sirve HTTP tambien procesa jobs.

Cloud Run por defecto puede pausar CPU fuera de requests y escalar a cero. Para que BullMQ sea
confiable en `prod`, configurar:

```text
min instances >= 1
CPU always allocated
```

Alternativa futura, mas limpia:

- `trading-backend-api`: solo HTTP.
- `trading-backend-worker`: misma imagen Nest, pero arranque dedicado a processors.

Esa separacion requiere ajustar el codigo de arranque o agregar un entrypoint especifico para workers.
Para esta version, la recomendacion practica es mantener API + processors juntos con min instances y
CPU always allocated.

## Base de Datos y Migraciones

Este repo usa Prisma y `DATABASE_URL`.

Comandos:

```bash
npm run prisma:generate
npm run prisma:deploy
npm run prisma:seed
```

En cloud:

- No correr migraciones automaticamente en startup.
- Ejecutar `npm run prisma:deploy` como paso de CI/CD o Cloud Run Job antes de desplegar la nueva
  revision.
- Ejecutar seed solo manualmente o en ambiente dev. En prod debe revisarse antes de correrlo.

Patron recomendado de deploy:

```text
1. Build imagenes
2. Push a Artifact Registry
3. Ejecutar prisma migrate deploy
4. Desplegar technical-agent
5. Desplegar backend
6. Smoke test /health y /auth/login
```

## Secretos y Variables por Ambiente

Variables minimas del backend:

```env
NODE_ENV=production
PORT=3000
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DB?schema=public
JWT_SECRET=...
JWT_REFRESH_SECRET=...
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
CORS_ORIGINS=https://frontend.example.com
COOKIE_SECURE=true
COOKIE_SAME_SITE=lax
REDIS_HOST=...
REDIS_PORT=6379
REDIS_PASSWORD=...
TECHNICAL_AGENT_BASE_URL=https://technical-agent-url
ENABLE_LIVE_TRADING=false
BROKER_PROVIDER=MT5
MT5_WORKER_BASE_URL=https://mt5-worker-url
MT5_DRY_RUN=true
```

Variables del technical-agent:

```env
PYTHON_ENV=production
TECHNICAL_SR_LOOKBACK=100
TECHNICAL_SR_TOLERANCE_PERCENT=0.002
TECHNICAL_LOW_VOL_ATR_PERCENT=0.003
TECHNICAL_HIGH_VOL_ATR_PERCENT=0.03
TECHNICAL_ENABLE_MULTI_TIMEFRAME=true
```

Variables MT5:

```env
ENABLE_LIVE_TRADING=false
MT5_DRY_RUN=true
MT5_LOGIN=
MT5_PASSWORD=
MT5_SERVER=
MT5_TERMINAL_PATH=
MT5_REQUEST_TIMEOUT_MS=10000
```

## Seguridad de Red

Recomendado:

- Backend Cloud Run publico solo si lo consumira frontend publico.
- Technical-agent privado: `--no-allow-unauthenticated`.
- MT5 worker privado o restringido por red/IP.
- Cloud SQL sin IP publica si se usa conectividad privada.
- Memorystore solo por VPC.
- CORS limitado al dominio del frontend.
- Cookies seguras en prod: `COOKIE_SECURE=true`.

## IAM

Service accounts sugeridas:

- `trading-deployer-sa`
  - Usada por GitHub Actions via Workload Identity Federation.
  - Permisos para Artifact Registry, Cloud Run deploy, Secret Manager access controlado y Cloud Run
    Jobs.

- `trading-backend-runtime-sa`
  - Usada por Cloud Run backend.
  - Lectura de secretos necesarios.
  - Acceso a Cloud SQL.
  - Permiso para invocar workers privados.

- `trading-worker-runtime-sa`
  - Usada por workers Python.
  - Permisos minimos.

## CI/CD con GitHub Actions

Branch mapping sugerido:

- `develop` -> dev.
- `main` -> prod.

Pipeline por ambiente:

```text
1. npm ci
2. npm run lint
3. npm run build
4. npm test -- --runInBand
5. docker build backend
6. docker build technical-agent
7. docker build mt5-worker, si aplica
8. docker push imagenes
9. ejecutar migraciones Prisma
10. deploy Cloud Run
11. smoke tests
```

Usar Workload Identity Federation, no llaves JSON largas en GitHub.

## Observabilidad

Minimo en GCP:

- Cloud Logging.
- Cloud Monitoring.
- Error Reporting.

Logs importantes emitidos por el backend:

- `technical_analysis_job`
- `signal_generation`
- `supervisor_decision`
- `paper_trade_opened`
- `paper_trade_closed`
- eventos de assisted trading
- eventos de live trading

Para produccion financiera, considerar despues:

- New Relic, Datadog o Grafana Cloud para APM.
- Dashboards de BullMQ/job failures.
- Alertas de live execution failed/blocked.

## Estimacion de Costos: Que Pedir

Para cotizar, pedir precios mensuales aproximados para:

### Dev

- 1 Cloud Run backend con min instances 0 o 1.
- 1 Cloud Run technical-agent con min instances 0.
- 1 Cloud SQL PostgreSQL pequeno.
- 1 Memorystore Redis Basic pequeno.
- Artifact Registry storage bajo.
- Secret Manager.
- Cloud Logging con retencion default.
- Serverless VPC Access Connector.

### Prod

- 1 Cloud Run backend con min instances 1, CPU always allocated.
- 1 Cloud Run technical-agent, min instances segun latencia.
- 1 Cloud SQL PostgreSQL con backups, storage autoscaling y posible HA.
- 1 Memorystore Redis Standard.
- Artifact Registry.
- Secret Manager.
- Cloud Logging/Monitoring/Error Reporting.
- Serverless VPC Access Connector.
- Cloud NAT, si se usa egress por VPC.
- Load Balancer + Cloud Armor, si se requiere dominio/WAF/IP fija.
- Compute Engine Windows VM o VPS externo, si se habilita MT5 real.

## Decision Recomendada Para Empezar

### Dev inicial

```text
Cloud Run backend min=1
Cloud Run technical-agent min=0
Cloud SQL Postgres pequeno
Memorystore Redis Basic
MT5 real apagado
```

Esto permite validar frontend, auth, colas, analisis, senales, paper trading, assisted trading y
analytics.

### Prod inicial prudente

```text
Cloud Run backend min=1 + CPU always allocated
Cloud Run technical-agent privado
Cloud SQL Postgres con backups
Memorystore Redis Standard
Secret Manager
Cloud Monitoring alertas basicas
MT5 real apagado o solo demo en Windows VM/VPS
```

Activar `LIVE_LIMITED` solo despues de pruebas demo y checklist operativo.

## Riesgos y Pendientes

- BullMQ depende de instancia viva en Cloud Run. Mitigacion: min instances 1 + CPU always allocated.
- MT5 real no es buen candidato para Cloud Run Linux. Mitigacion: Windows VM/VPS.
- `DATABASE_URL` con Cloud SQL debe definirse segun el metodo elegido: IP privada, Cloud SQL connector
  o proxy en jobs de migracion.
- Los workers privados necesitan IAM invoker correcto.
- Revisar cuotas de Cloud Run, Cloud SQL connections y Redis antes de carga alta.
- Definir retencion de logs para no disparar costos.
