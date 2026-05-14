#!/usr/bin/env bash

export PATH="${HOME}/google-cloud-sdk/bin:${PATH}"
export CLOUDSDK_PYTHON="${CLOUDSDK_PYTHON:-/opt/homebrew/bin/python3.13}"

if ! command -v gcloud >/dev/null 2>&1; then
  echo "gcloud was not found. Install Google Cloud CLI or add it to PATH." >&2
  exit 127
fi
