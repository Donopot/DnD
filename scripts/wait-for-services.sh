#!/usr/bin/env bash
# wait-for-services.sh — polls all DnD services until healthy or timeout.
# Usage: bash scripts/wait-for-services.sh [timeout_seconds]

set -euo pipefail

TIMEOUT="${1:-120}"
INTERVAL=2
DEADLINE=$((SECONDS + TIMEOUT))

echo "⏳ Waiting up to ${TIMEOUT}s for services…"

check() {
  local url="$1" label="$2"
  if curl -sf "$url" >/dev/null 2>&1; then
    echo "   ✅ $label ($url)"
    return 0
  fi
  return 1
}

health_ok=false
total_required=4

while [ $SECONDS -lt $DEADLINE ]; do
  ok=0

  check "http://localhost:8091/api/health" "backend" && ((ok++)) || true
  check "http://localhost:8090/"             "frontend" && ((ok++)) || true

  # MinIO port 9000 is internal (not published). Check via docker exec.
  if docker exec dnd-minio curl -sf http://localhost:9000/minio/health/live >/dev/null 2>&1; then
    echo "   ✅ minio"
    ((ok++))
  else
    true
  fi

  # Redis — use docker exec
  if docker exec dnd-redis redis-cli ping 2>/dev/null | grep -q PONG; then
    echo "   ✅ redis"
    ((ok++))
  else
    true
  fi

  # Require ALL services, not just 3
  if [ $ok -ge $total_required ]; then
    health_ok=true
    break
  fi

  sleep "$INTERVAL"
done

if [ "$health_ok" = true ]; then
  echo "✅ All services healthy."
  exit 0
else
  echo "❌ Timeout after ${TIMEOUT}s — some services are not healthy."
  echo "   Running containers:"
  docker compose ps --format 'table {{.Name}}\t{{.Status}}' 2>/dev/null || true
  exit 1
fi
