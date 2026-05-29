#!/usr/bin/env sh
set -eu

API_URL="${API_URL:-http://127.0.0.1:8091}"

for i in $(seq 1 60); do
  if curl -fsS "$API_URL/api/health" >/dev/null 2>&1; then
    echo "api-ready"
    exit 0
  fi
  sleep 1
done

echo "api-not-ready" >&2
exit 1
