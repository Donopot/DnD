#!/usr/bin/env sh
set -eu

API_URL="${API_URL:-http://127.0.0.1:8091}"
RUN_ID="${RUN_ID:-$(date +%Y%m%d%H%M%S)}"
EMAIL="${DND_SMOKE_EMAIL:-smoke+${RUN_ID}@dnd-smoke.fr}"
PASSWORD="${DND_SMOKE_PASSWORD:-SmokePass123!}"
DISPLAY_NAME="${DND_SMOKE_DISPLAY_NAME:-Smoke GM}"

TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

log() {
  printf '\n[%s] %s\n' "$(date +%H:%M:%S)" "$*"
}

fail() {
  echo "smoke-backend-failed: $*" >&2
  exit 1
}

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
    if isinstance(value, list):
        value = value[int(part)]
    else:
        value = value[part]

print(value)
PY
}

request() {
  method="$1"
  path="$2"
  body="${3:-}"
  token="${4:-}"
  output="$5"

  if [ -n "$token" ] && [ -n "$body" ]; then
    status="$(
      curl -sS -o "$output" -w '%{http_code}' \
        -X "$method" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $token" \
        --data "$body" \
        "$API_URL$path"
    )"
  elif [ -n "$token" ]; then
    status="$(
      curl -sS -o "$output" -w '%{http_code}' \
        -X "$method" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $token" \
        "$API_URL$path"
    )"
  elif [ -n "$body" ]; then
    status="$(
      curl -sS -o "$output" -w '%{http_code}' \
        -X "$method" \
        -H "Content-Type: application/json" \
        --data "$body" \
        "$API_URL$path"
    )"
  else
    status="$(
      curl -sS -o "$output" -w '%{http_code}' \
        -X "$method" \
        -H "Content-Type: application/json" \
        "$API_URL$path"
    )"
  fi

  case "$status" in
    200|201|204) return 0 ;;
    *)
      echo "HTTP $status for $method $path" >&2
      cat "$output" >&2 || true
      return 1
      ;;
  esac
}

log "Waiting for API at $API_URL"

for _ in $(seq 1 60); do
  if curl -fsS "$API_URL/api/health" >/dev/null 2>&1; then
    log "API ready"
    break
  fi

  sleep 1
done

log "Health check"
HEALTH="$TMP_DIR/health.json"
request GET /api/health "" "" "$HEALTH" || fail "health failed"

[ "$(json_get "$HEALTH" service)" = "dnd-backend" ] || fail "unexpected service"
[ "$(json_get "$HEALTH" database)" = "ok" ] || fail "database failed"
[ "$(json_get "$HEALTH" object_storage)" = "ok" ] || fail "object storage failed"
[ "$(json_get "$HEALTH" redis)" = "ok" ] || fail "redis failed"

log "Register smoke GM"
REGISTER="$TMP_DIR/register.json"
request POST /api/auth/register "{\"email\":\"$EMAIL\",\"display_name\":\"$DISPLAY_NAME\",\"password\":\"$PASSWORD\"}" "" "$REGISTER" || fail "register failed"

ACCESS_TOKEN="$(json_get "$REGISTER" access_token)"
USER_ID="$(json_get "$REGISTER" user.id)"

log "Login"
LOGIN="$TMP_DIR/login.json"
request POST /api/auth/login "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}" "" "$LOGIN" || fail "login failed"

log "Auth me"
ME="$TMP_DIR/me.json"
request GET /api/auth/me "" "$ACCESS_TOKEN" "$ME" || fail "auth me failed"

[ "$(json_get "$ME" id)" = "$USER_ID" ] || fail "auth me mismatch"

log "Create campaign"
CAMPAIGN="$TMP_DIR/campaign.json"
request POST /api/campaigns "{\"name\":\"Smoke Campaign $RUN_ID\",\"description\":\"Backend smoke test campaign\"}" "$ACCESS_TOKEN" "$CAMPAIGN" || fail "create campaign failed"

CAMPAIGN_ID="$(json_get "$CAMPAIGN" id)"

log "List campaigns"
CAMPAIGNS="$TMP_DIR/campaigns.json"
request GET /api/campaigns "" "$ACCESS_TOKEN" "$CAMPAIGNS" || fail "list campaigns failed"

log "Create character"
CHARACTER="$TMP_DIR/character.json"
request POST "/api/campaigns/$CAMPAIGN_ID/characters" "{\"name\":\"Smoke Hero\",\"hp_current\":12,\"hp_max\":12,\"armor_class\":14,\"speed\":30}" "$ACCESS_TOKEN" "$CHARACTER" || fail "create character failed"

CHARACTER_ID="$(json_get "$CHARACTER" id)"

log "Create scene"
SCENE="$TMP_DIR/scene.json"
request POST "/api/campaigns/$CAMPAIGN_ID/scenes" "{\"name\":\"Smoke Scene\",\"description\":\"Smoke scene\",\"grid_size\":50,\"width\":1000,\"height\":700,\"is_active\":true}" "$ACCESS_TOKEN" "$SCENE" || fail "create scene failed"

SCENE_ID="$(json_get "$SCENE" id)"

log "Create token"
TOKEN_FILE="$TMP_DIR/token.json"
request POST "/api/scenes/$SCENE_ID/tokens" "{\"character_id\":\"$CHARACTER_ID\",\"name\":\"Smoke Token\",\"x\":100,\"y\":100,\"size\":1,\"color\":\"#7c3aed\",\"is_hidden\":false}" "$ACCESS_TOKEN" "$TOKEN_FILE" || fail "create token failed"

SCENE_TOKEN_ID="$(json_get "$TOKEN_FILE" id)"

log "Update token"
TOKEN_UPDATE="$TMP_DIR/token-update.json"
request PATCH "/api/tokens/$SCENE_TOKEN_ID" "{\"x\":150,\"y\":150}" "$ACCESS_TOKEN" "$TOKEN_UPDATE" || fail "update token failed"

[ "$(json_get "$TOKEN_UPDATE" x)" = "150" ] || fail "token x not updated"

log "Create encounter"
ENCOUNTER="$TMP_DIR/encounter.json"
request POST "/api/campaigns/$CAMPAIGN_ID/encounters" "{\"name\":\"Smoke Encounter\",\"scene_id\":\"$SCENE_ID\"}" "$ACCESS_TOKEN" "$ENCOUNTER" || fail "create encounter failed"

ENCOUNTER_ID="$(json_get "$ENCOUNTER" id)"

log "Create combatant"
COMBATANT="$TMP_DIR/combatant.json"
request POST "/api/encounters/$ENCOUNTER_ID/combatants" "{\"token_id\":\"$SCENE_TOKEN_ID\",\"character_id\":\"$CHARACTER_ID\",\"name\":\"Smoke Hero\",\"initiative\":15,\"armor_class\":14,\"hp_current\":12,\"hp_max\":12,\"conditions\":[],\"notes\":\"\",\"is_player_controlled\":true,\"is_hidden\":false}" "$ACCESS_TOKEN" "$COMBATANT" || fail "create combatant failed"

COMBATANT_ID="$(json_get "$COMBATANT" id)"
[ -n "$COMBATANT_ID" ] || fail "missing combatant id"

log "Start encounter"
START="$TMP_DIR/start.json"
request POST "/api/encounters/$ENCOUNTER_ID/start" "" "$ACCESS_TOKEN" "$START" || fail "start encounter failed"

[ "$(json_get "$START" status)" = "active" ] || fail "encounter not active"

log "Next turn"
NEXT="$TMP_DIR/next.json"
request POST "/api/encounters/$ENCOUNTER_ID/next-turn" "" "$ACCESS_TOKEN" "$NEXT" || fail "next turn failed"

log "Smoke backend OK"

cat <<EOF_SUMMARY
smoke-backend-ok
api_url=$API_URL
user_id=$USER_ID
campaign_id=$CAMPAIGN_ID
scene_id=$SCENE_ID
token_id=$SCENE_TOKEN_ID
encounter_id=$ENCOUNTER_ID
EOF_SUMMARY
