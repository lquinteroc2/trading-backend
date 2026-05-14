#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/common.sh"
source "${SCRIPT_DIR}/dev.env"

gcloud config set project "${PROJECT_ID}"

gcloud services enable \
  artifactregistry.googleapis.com \
  cloudbuild.googleapis.com \
  run.googleapis.com \
  sqladmin.googleapis.com \
  redis.googleapis.com \
  secretmanager.googleapis.com \
  vpcaccess.googleapis.com

gcloud artifacts repositories create "${ARTIFACT_REPOSITORY}" \
  --repository-format=docker \
  --location="${REGION}" \
  --description="Trading dev Docker images" || true

gcloud iam service-accounts create "${BACKEND_RUNTIME_SA}" \
  --display-name="Trading backend dev runtime" || true

gcloud iam service-accounts create "${WORKER_RUNTIME_SA}" \
  --display-name="Trading worker dev runtime" || true

BACKEND_SA_EMAIL="${BACKEND_RUNTIME_SA}@${PROJECT_ID}.iam.gserviceaccount.com"

gcloud projects add-iam-policy-binding "${PROJECT_ID}" \
  --member="serviceAccount:${BACKEND_SA_EMAIL}" \
  --role="roles/cloudsql.client" >/dev/null

gcloud projects add-iam-policy-binding "${PROJECT_ID}" \
  --member="serviceAccount:${BACKEND_SA_EMAIL}" \
  --role="roles/secretmanager.secretAccessor" >/dev/null

gcloud compute networks vpc-access connectors create "${VPC_CONNECTOR}" \
  --region="${REGION}" \
  --range="${VPC_CONNECTOR_RANGE:-172.16.0.0/28}" \
  --min-instances=2 \
  --max-instances=3 || true

gcloud sql instances create "${CLOUD_SQL_INSTANCE}" \
  --database-version=POSTGRES_16 \
  --edition=ENTERPRISE \
  --tier="${CLOUD_SQL_TIER}" \
  --region="${REGION}" \
  --storage-size=10GB \
  --storage-type=SSD \
  --no-deletion-protection || true

gcloud sql databases create "${CLOUD_SQL_DATABASE}" \
  --instance="${CLOUD_SQL_INSTANCE}" || true

DB_PASSWORD="$(openssl rand -hex 18)"
gcloud sql users create "${CLOUD_SQL_USER}" \
  --instance="${CLOUD_SQL_INSTANCE}" \
  --password="${DB_PASSWORD}" || \
  gcloud sql users set-password "${CLOUD_SQL_USER}" \
    --instance="${CLOUD_SQL_INSTANCE}" \
    --password="${DB_PASSWORD}"

gcloud redis instances create "${REDIS_INSTANCE}" \
  --region="${REGION}" \
  --tier=basic \
  --size="${REDIS_SIZE_GB}" \
  --redis-version=redis_7_0 || true

INSTANCE_CONNECTION_NAME="${PROJECT_ID}:${REGION}:${CLOUD_SQL_INSTANCE}"
DATABASE_URL="postgresql://${CLOUD_SQL_USER}:${DB_PASSWORD}@localhost/${CLOUD_SQL_DATABASE}?host=/cloudsql/${INSTANCE_CONNECTION_NAME}&schema=public"
JWT_SECRET="$(openssl rand -hex 32)"
JWT_REFRESH_SECRET="$(openssl rand -hex 32)"

printf "%s" "${DATABASE_URL}" | gcloud secrets create trading-dev-database-url --data-file=- || \
  printf "%s" "${DATABASE_URL}" | gcloud secrets versions add trading-dev-database-url --data-file=-

printf "%s" "${JWT_SECRET}" | gcloud secrets create trading-dev-jwt-secret --data-file=- || \
  printf "%s" "${JWT_SECRET}" | gcloud secrets versions add trading-dev-jwt-secret --data-file=-

printf "%s" "${JWT_REFRESH_SECRET}" | gcloud secrets create trading-dev-jwt-refresh-secret --data-file=- || \
  printf "%s" "${JWT_REFRESH_SECRET}" | gcloud secrets versions add trading-dev-jwt-refresh-secret --data-file=-

if [[ -n "${MT5_WORKER_API_KEY:-}" ]]; then
  printf "%s" "${MT5_WORKER_API_KEY}" | gcloud secrets create trading-dev-mt5-worker-api-key --data-file=- || \
    printf "%s" "${MT5_WORKER_API_KEY}" | gcloud secrets versions add trading-dev-mt5-worker-api-key --data-file=-
fi

echo "Bootstrap complete."
echo "Redis host: $(gcloud redis instances describe "${REDIS_INSTANCE}" --region="${REGION}" --format='value(host)')"
echo "Cloud SQL connection: ${INSTANCE_CONNECTION_NAME}"
