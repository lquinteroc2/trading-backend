# Despliegue Dev en Google Cloud

Esta es la ruta rapida para probar la version dev usando los creditos gratis de Google Cloud.

## Que Se Despliega

- Backend publico en Cloud Run: `trading-backend-dev`
- Agente tecnico privado en Cloud Run: `trading-technical-agent-dev`
- Worker MT5 dry-run privado en Cloud Run, salvo que configures un VPS externo
- Base de datos PostgreSQL en Cloud SQL
- Redis en Memorystore
- Secretos en Secret Manager
- Conector VPC para que Cloud Run pueda llegar a Redis

El backend queda con `min-instances=1` y CPU siempre asignada porque los processors de BullMQ corren
dentro de la app Nest. Si lo bajas a cero, ahorras mas, pero las colas no procesan mientras no haya
instancia viva.

## Preparacion Una Sola Vez

1. Instala Google Cloud CLI.
2. Inicia sesion:

```bash
gcloud auth login
```

3. Crea o selecciona un proyecto de Google Cloud con billing activo usando tus creditos.
4. Copia el archivo de variables:

```bash
cp deploy/gcp/dev.env.example deploy/gcp/dev.env
```

5. Edita `deploy/gcp/dev.env`.

Como minimo cambia:

```env
PROJECT_ID=tu-proyecto-gcp
REGION=us-central1
CORS_ORIGINS=https://tu-frontend-dev.example.com
```

Para una prueba dev simple, deja `MT5_WORKER_BASE_URL` vacio. El script va a crear un worker MT5
dry-run privado en Cloud Run.

Para MT5 real opcion B, es decir VPS Windows externo, configura:

```env
MT5_WORKER_BASE_URL=https://tu-vps-windows-restringido.example.com
MT5_WORKER_API_KEY=un-secreto-largo-y-aleatorio
ENABLE_LIVE_TRADING=false
MT5_DRY_RUN=true
```

Mantén trading real apagado hasta validar el worker en Windows, cuenta demo del broker,
firewall/allowlist de IPs, HTTPS y checklist de ejecucion.

## Desplegar

```bash
deploy/gcp/bootstrap-dev.sh
deploy/gcp/build-images-dev.sh
deploy/gcp/run-migrations-dev.sh
deploy/gcp/deploy-dev.sh
```

Que hace cada comando:

- `bootstrap-dev.sh`: crea recursos base en GCP: Artifact Registry, Cloud SQL, Redis, secretos,
  service accounts y VPC connector.
- `build-images-dev.sh`: construye y sube imagenes Docker del backend, technical-agent y mt5-worker.
- `run-migrations-dev.sh`: ejecuta migraciones Prisma contra Cloud SQL.
- `deploy-dev.sh`: despliega los servicios en Cloud Run.

El ultimo comando imprime la URL del backend. Pruebala asi:

```bash
curl https://BACKEND_URL/api/v1/health
```

Reemplaza `BACKEND_URL` por la URL real que imprima Cloud Run.

## MT5 Opcion B: VPS Windows

Usa un VPS Windows con el terminal MT5 instalado y el worker FastAPI de `services/mt5-worker`.

Minimo debe estar restringido con:

- Firewall con allowlist de IP del backend, si configuras salida fija desde GCP.
- HTTPS obligatorio.
- `MT5_WORKER_API_KEY`, que el backend envia como header `X-API-Key`.
- `ENABLE_LIVE_TRADING=false` y `MT5_DRY_RUN=true` hasta validar trading demo.

Si necesitas una IP fija de salida desde el backend para meterla en el firewall del VPS, agrega
Cloud NAT con IP estatica antes de activar el allowlist estricto.

## Costos y Pausa

Este dev no es completamente gratis. Cloud SQL, Memorystore, Serverless VPC Access y el backend con
`min-instances=1` consumen creditos incluso con poco trafico.

Para pausar parte del gasto:

```bash
gcloud run services update trading-backend-dev --region=REGION --min-instances=0
gcloud run services update trading-technical-agent-dev --region=REGION --min-instances=0
gcloud run services update trading-mt5-dry-run-dev --region=REGION --min-instances=0
```

Reemplaza `REGION` por tu region, por ejemplo `us-central1`.

Cloud SQL y Memorystore siguen costando mientras existan. Si terminaste un experimento y quieres
dejar de gastar, elimina esos recursos desde la consola de GCP o con `gcloud`.

## Orden Recomendado Para Tu Caso

1. Primero prueba todo en dev con MT5 dry-run en Cloud Run.
2. Luego conecta el VPS Windows externo con `MT5_WORKER_BASE_URL`.
3. Despues valida cuenta demo real en MT5.
4. Solo al final cambia `ENABLE_LIVE_TRADING=true` y `MT5_DRY_RUN=false`, cuando ya tengas controles
   de riesgo, firewall, logs y checklist listos.
