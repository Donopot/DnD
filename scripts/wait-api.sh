#!/usr/bin/env sh
set -eu

API_URL="${API_URL:-http://127.0.0.1:8091}"
MAX_ATTEMPTS="${WAIT_API_MAX_ATTEMPTS:-60}"

json_get() {
  python3 - "$1" "$2" <<'PY'
import json
import sys

path = sys.argv[1]
expr = sys.argv[2]

with open(path, encoding="utf-8") as handle:
    data = json.load(handle)

value = data
for part in expr.split("."):
    value = value[part]

print(value)
PY
}

TMP_FILE="$(mktemp)"
trap 'rm -f "$TMP_FILE"' EXIT

for i in $(seq 1 "$MAX_ATTEMPTS"); do
  if curl -fsS "$API_URL/api/health" > "$TMP_FILE" 2>/dev/null; then
    SERVICE="$(json_get "$TMP_FILE" service || true)"
    STATUS="$(json_get "$TMP_FILE" status || true)"
    DATABASE="$(json_get "$TMP_FILE" database || true)"
    OBJECT_STORAGE="$(json_get "$TMP_FILE" object_storage || true)"
    REDIS="$(json_get "$TMP_FILE" redis || true)"

    if [ "$SERVICE" = "dnd-backend" ] \
      && [ "$STATUS" = "ok" ] \
      && [ "$DATABASE" = "ok" ] \
      && [ "$OBJECT_STORAGE" = "ok" ] \
      && [ "$REDIS" = "ok" ]; then
      echo "api-ready"
      exit 0
    fi

    echo "api-health-not-ready attempt=$i status=$STATUS database=$DATABASE object_storage=$OBJECT_STORAGE redis=$REDIS"
  else
    echo "api-not-ready-yet attempt=$i"
  fi

  sleep 1
done

echo "api-not-ready" >&2
cat "$TMP_FILE" >&2 || true
exit 1
