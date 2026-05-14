#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/common.sh"
source "${SCRIPT_DIR}/dev.env"

gcloud config set project "${PROJECT_ID}"

REGISTRY="${REGION}-docker.pkg.dev/${PROJECT_ID}/${ARTIFACT_REPOSITORY}"
BACKEND_SA_EMAIL="${BACKEND_RUNTIME_SA}@${PROJECT_ID}.iam.gserviceaccount.com"
WORKER_SA_EMAIL="${WORKER_RUNTIME_SA}@${PROJECT_ID}.iam.gserviceaccount.com"
INSTANCE_CONNECTION_NAME="${PROJECT_ID}:${REGION}:${CLOUD_SQL_INSTANCE}"
REDIS_HOST="$(gcloud redis instances describe "${REDIS_INSTANCE}" --region="${REGION}" --format='value(host)')"

gcloud run deploy "${TECHNICAL_AGENT_SERVICE}" \
  --image="${REGISTRY}/technical-agent:dev" \
  --region="${REGION}" \
  --service-account="${WORKER_SA_EMAIL}" \
  --no-allow-unauthenticated \
  --port=8000 \
  --memory=512Mi \
  --cpu=1 \
  --min-instances=0 \
  --max-instances=2 \
  --set-env-vars="PYTHON_ENV=production,TECHNICAL_ENABLE_MULTI_TIMEFRAME=true"

TECHNICAL_AGENT_URL="$(gcloud run services describe "${TECHNICAL_AGENT_SERVICE}" \
  --region="${REGION}" \
  --format='value(status.url)')"

gcloud run services add-iam-policy-binding "${TECHNICAL_AGENT_SERVICE}" \
  --region="${REGION}" \
  --member="serviceAccount:${BACKEND_SA_EMAIL}" \
  --role="roles/run.invoker" >/dev/null

MT5_ENV="MT5_WORKER_BASE_URL=${MT5_WORKER_BASE_URL:-},ENABLE_LIVE_TRADING=${ENABLE_LIVE_TRADING:-false},MT5_DRY_RUN=${MT5_DRY_RUN:-true}"
MT5_SECRETS=""
MT5_AUTH_AUDIENCE=""

if [[ -z "${MT5_WORKER_BASE_URL:-}" ]]; then
  gcloud run deploy "${MT5_DRY_RUN_SERVICE}" \
    --image="${REGISTRY}/mt5-worker:dev" \
    --region="${REGION}" \
    --service-account="${WORKER_SA_EMAIL}" \
    --no-allow-unauthenticated \
    --port=8010 \
    --memory=512Mi \
    --cpu=1 \
    --min-instances=0 \
    --max-instances=1 \
    --set-env-vars="ENABLE_LIVE_TRADING=false,MT5_DRY_RUN=true"

  MT5_WORKER_BASE_URL="$(gcloud run services describe "${MT5_DRY_RUN_SERVICE}" \
    --region="${REGION}" \
    --format='value(status.url)')"
  MT5_AUTH_AUDIENCE="${MT5_WORKER_BASE_URL}"

  gcloud run services add-iam-policy-binding "${MT5_DRY_RUN_SERVICE}" \
    --region="${REGION}" \
    --member="serviceAccount:${BACKEND_SA_EMAIL}" \
    --role="roles/run.invoker" >/dev/null
fi

MT5_ENV="MT5_WORKER_BASE_URL=${MT5_WORKER_BASE_URL},MT5_WORKER_AUTH_AUDIENCE=${MT5_AUTH_AUDIENCE},ENABLE_LIVE_TRADING=${ENABLE_LIVE_TRADING:-false},MT5_DRY_RUN=${MT5_DRY_RUN:-true}"
if [[ -n "${MT5_WORKER_API_KEY:-}" ]]; then
  MT5_SECRETS=",MT5_WORKER_API_KEY=trading-dev-mt5-worker-api-key:latest"
fi

gcloud run deploy "${BACKEND_SERVICE}" \
  --image="${REGISTRY}/trading-backend:dev" \
  --region="${REGION}" \
  --service-account="${BACKEND_SA_EMAIL}" \
  --allow-unauthenticated \
  --port=3000 \
  --memory=1Gi \
  --cpu=1 \
  --min-instances=1 \
  --max-instances=2 \
  --no-cpu-throttling \
  --vpc-connector="${VPC_CONNECTOR}" \
  --vpc-egress=private-ranges-only \
  --add-cloudsql-instances="${INSTANCE_CONNECTION_NAME}" \
  --set-env-vars="NODE_ENV=production,SKIP_PRISMA_MIGRATE=true,CORS_ORIGINS=${CORS_ORIGINS},COOKIE_SECURE=true,COOKIE_SAME_SITE=lax,REDIS_HOST=${REDIS_HOST},REDIS_PORT=6379,TECHNICAL_AGENT_BASE_URL=${TECHNICAL_AGENT_URL},TECHNICAL_AGENT_AUTH_AUDIENCE=${TECHNICAL_AGENT_URL},BROKER_PROVIDER=MT5,${MT5_ENV}" \
  --set-secrets="DATABASE_URL=trading-dev-database-url:latest,JWT_SECRET=trading-dev-jwt-secret:latest,JWT_REFRESH_SECRET=trading-dev-jwt-refresh-secret:latest${MT5_SECRETS}"

echo "Backend URL:"
gcloud run services describe "${BACKEND_SERVICE}" --region="${REGION}" --format='value(status.url)'
