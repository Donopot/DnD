#!/usr/bin/env sh
set -eu

API_URL="${API_URL:-http://127.0.0.1:8091}"
RUN_ID="${RUN_ID:-$(date +%Y%m%d%H%M%S)}"
EMAIL="${DND_SMOKE_EMAIL:-gmnotes+${RUN_ID}@dnd-smoke.fr}"
PASSWORD="${DND_SMOKE_PASSWORD:-SmokePass123!}"

TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

log() {
  printf '\n[%s] %s\n' "$(date +%H:%M:%S)" "$*"
}

fail() {
  echo "smoke-gm-notes-failed: $*" >&2
  exit 1
}

json_get() {
  python3 - "$1" "$2" <<'PY'
import json
import sys

with open(sys.argv[1], encoding="utf-8") as handle:
    data = json.load(handle)

value = data
for part in sys.argv[2].split("."):
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
    status="$(curl -sS -o "$output" -w '%{http_code}' -X "$method" -H "Content-Type: application/json" -H "Authorization: Bearer $token" --data "$body" "$API_URL$path")"
  elif [ -n "$token" ]; then
    status="$(curl -sS -o "$output" -w '%{http_code}' -X "$method" -H "Content-Type: application/json" -H "Authorization: Bearer $token" "$API_URL$path")"
  elif [ -n "$body" ]; then
    status="$(curl -sS -o "$output" -w '%{http_code}' -X "$method" -H "Content-Type: application/json" --data "$body" "$API_URL$path")"
  else
    status="$(curl -sS -o "$output" -w '%{http_code}' -X "$method" -H "Content-Type: application/json" "$API_URL$path")"
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

log "Health"
HEALTH="$TMP_DIR/health.json"
request GET /api/health "" "" "$HEALTH" || fail "health failed"

log "Register"
REGISTER="$TMP_DIR/register.json"
request POST /api/auth/register "{\"email\":\"$EMAIL\",\"display_name\":\"GM Notes Smoke\",\"password\":\"$PASSWORD\"}" "" "$REGISTER" || fail "register failed"
TOKEN="$(json_get "$REGISTER" access_token)"

log "Create campaign"
CAMPAIGN="$TMP_DIR/campaign.json"
request POST /api/campaigns "{\"name\":\"GM Notes Smoke $RUN_ID\",\"description\":\"BE-1 smoke\"}" "$TOKEN" "$CAMPAIGN" || fail "campaign failed"
CAMPAIGN_ID="$(json_get "$CAMPAIGN" id)"

log "Create scene"
SCENE="$TMP_DIR/scene.json"
request POST "/api/campaigns/$CAMPAIGN_ID/scenes" "{\"name\":\"Notes Scene\",\"description\":\"Scene for notes\",\"grid_size\":50,\"width\":800,\"height\":600,\"is_active\":true}" "$TOKEN" "$SCENE" || fail "scene failed"
SCENE_ID="$(json_get "$SCENE" id)"

log "Create token"
SCENE_TOKEN="$TMP_DIR/token.json"
request POST "/api/scenes/$SCENE_ID/tokens" "{\"name\":\"Notes Token\",\"x\":100,\"y\":100,\"size\":1,\"color\":\"#7c3aed\",\"is_hidden\":false}" "$TOKEN" "$SCENE_TOKEN" || fail "token failed"
TOKEN_ID="$(json_get "$SCENE_TOKEN" id)"

log "Create GM note"
NOTE="$TMP_DIR/note.json"
request POST "/api/campaigns/$CAMPAIGN_ID/gm-notes" "{\"scene_id\":\"$SCENE_ID\",\"token_id\":\"$TOKEN_ID\",\"title\":\"Secret MJ\",\"content\":\"Indice secret BE-1\",\"visibility\":\"gm_team\"}" "$TOKEN" "$NOTE" || fail "create note failed"
NOTE_ID="$(json_get "$NOTE" id)"
VERSION="$(json_get "$NOTE" version)"
[ "$VERSION" = "1" ] || fail "initial version should be 1"

log "List GM notes"
NOTES="$TMP_DIR/notes.json"
request GET "/api/campaigns/$CAMPAIGN_ID/gm-notes?scene_id=$SCENE_ID" "" "$TOKEN" "$NOTES" || fail "list notes failed"
LIST_ID="$(json_get "$NOTES" 0.id)"
[ "$LIST_ID" = "$NOTE_ID" ] || fail "created note missing from list"

log "Get GM note"
GET_NOTE="$TMP_DIR/get-note.json"
request GET "/api/gm-notes/$NOTE_ID" "" "$TOKEN" "$GET_NOTE" || fail "get note failed"

log "Patch GM note"
PATCH_NOTE="$TMP_DIR/patch-note.json"
request PATCH "/api/gm-notes/$NOTE_ID" "{\"title\":\"Secret MJ modifié\",\"content\":\"Indice secret BE-1 modifié\"}" "$TOKEN" "$PATCH_NOTE" || fail "patch note failed"
PATCH_VERSION="$(json_get "$PATCH_NOTE" version)"
[ "$PATCH_VERSION" = "2" ] || fail "patched version should be 2"

log "Delete GM note"
DELETE_NOTE="$TMP_DIR/delete-note.json"
request DELETE "/api/gm-notes/$NOTE_ID" "" "$TOKEN" "$DELETE_NOTE" || fail "delete note failed"

log "GM notes smoke OK"

cat <<EOF_SUMMARY
smoke-gm-notes-ok
campaign_id=$CAMPAIGN_ID
scene_id=$SCENE_ID
token_id=$TOKEN_ID
note_id=$NOTE_ID
EOF_SUMMARY
