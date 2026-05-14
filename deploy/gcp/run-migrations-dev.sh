#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/dev.env"

gcloud config set project "${PROJECT_ID}"

REGISTRY="${REGION}-docker.pkg.dev/${PROJECT_ID}/${ARTIFACT_REPOSITORY}"
BACKEND_SA_EMAIL="${BACKEND_RUNTIME_SA}@${PROJECT_ID}.iam.gserviceaccount.com"
INSTANCE_CONNECTION_NAME="${PROJECT_ID}:${REGION}:${CLOUD_SQL_INSTANCE}"
JOB_NAME="trading-backend-migrate-dev"

gcloud run jobs deploy "${JOB_NAME}" \
  --image="${REGISTRY}/trading-backend:dev" \
  --region="${REGION}" \
  --service-account="${BACKEND_SA_EMAIL}" \
  --add-cloudsql-instances="${INSTANCE_CONNECTION_NAME}" \
  --set-secrets="DATABASE_URL=trading-dev-database-url:latest" \
  --command=npm \
  --args=run,prisma:deploy \
  --max-retries=0 \
  --task-timeout=10m

gcloud run jobs execute "${JOB_NAME}" \
  --region="${REGION}" \
  --wait
