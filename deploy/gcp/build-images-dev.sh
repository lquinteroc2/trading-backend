#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
source "${SCRIPT_DIR}/common.sh"
source "${SCRIPT_DIR}/dev.env"

gcloud config set project "${PROJECT_ID}"

REGISTRY="${REGION}-docker.pkg.dev/${PROJECT_ID}/${ARTIFACT_REPOSITORY}"

gcloud builds submit "${REPO_ROOT}" \
  --tag="${REGISTRY}/trading-backend:dev"

gcloud builds submit "${REPO_ROOT}/services/agents" \
  --tag="${REGISTRY}/technical-agent:dev"

gcloud builds submit "${REPO_ROOT}/services/mt5-worker" \
  --tag="${REGISTRY}/mt5-worker:dev"

echo "Pushed:"
echo "${REGISTRY}/trading-backend:dev"
echo "${REGISTRY}/technical-agent:dev"
echo "${REGISTRY}/mt5-worker:dev"
