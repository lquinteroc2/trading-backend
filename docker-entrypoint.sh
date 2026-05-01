#!/bin/sh
set -e

attempt=1
max_attempts=30

until npx prisma migrate deploy; do
  if [ "$attempt" -ge "$max_attempts" ]; then
    echo "Prisma migrate deploy failed after $max_attempts attempts"
    exit 1
  fi

  echo "Database is not ready for Prisma yet. Retrying in 2 seconds... ($attempt/$max_attempts)"
  attempt=$((attempt + 1))
  sleep 2
done

exec node dist/main.js
