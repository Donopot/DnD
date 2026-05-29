#!/usr/bin/env sh
set -eu

API_URL="${API_URL:-http://127.0.0.1:8091}"
EMAIL="phase8-$(date +%s)@dtmini.com"
export EMAIL

REGISTER_PAYLOAD="/tmp/dnd_phase8_register.json"
CAMPAIGN_PAYLOAD="/tmp/dnd_phase8_campaign.json"
SCENE_PAYLOAD="/tmp/dnd_phase8_scene.json"
BACKGROUND_PAYLOAD="/tmp/dnd_phase8_background.json"
MAP_FILE="/tmp/dnd_phase8_map.png"
ASSET_BODY="/tmp/dnd_phase8_asset_content.png"

python3 -c 'import json,os; print(json.dumps({"email": os.environ["EMAIL"], "display_name": "Phase Eight GM", "password": "phase8-password"}))' > "$REGISTER_PAYLOAD"

AUTH="$(
  curl -fsS \
    -H "Content-Type: application/json" \
    --data-binary "@$REGISTER_PAYLOAD" \
    "$API_URL/api/auth/register"
)"

TOKEN="$(printf "%s" "$AUTH" | python3 -c 'import json,sys; print(json.load(sys.stdin)["access_token"])')"

python3 -c 'import json; print(json.dumps({"name": "Phase 8 Campaign", "description": "Validation map assets"}))' > "$CAMPAIGN_PAYLOAD"

CAMPAIGN="$(
  curl -fsS \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    --data-binary "@$CAMPAIGN_PAYLOAD" \
    "$API_URL/api/campaigns"
)"

CAMPAIGN_ID="$(printf "%s" "$CAMPAIGN" | python3 -c 'import json,sys; print(json.load(sys.stdin)["id"])')"
export CAMPAIGN_ID

python3 -c 'import json; print(json.dumps({"name": "Asset Test Scene", "description": "Scene with uploaded background", "grid_size": 50, "width": 1200, "height": 800, "is_active": True}))' > "$SCENE_PAYLOAD"

SCENE="$(
  curl -fsS \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    --data-binary "@$SCENE_PAYLOAD" \
    "$API_URL/api/campaigns/$CAMPAIGN_ID/scenes"
)"

SCENE_ID="$(printf "%s" "$SCENE" | python3 -c 'import json,sys; print(json.load(sys.stdin)["id"])')"
export SCENE_ID

python3 - <<'PY'
import base64
from pathlib import Path

png = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMB/6X8X2sAAAAASUVORK5CYII="
Path("/tmp/dnd_phase8_map.png").write_bytes(base64.b64decode(png))
PY

ASSET="$(
  curl -fsS \
    -H "Authorization: Bearer $TOKEN" \
    -F "file=@$MAP_FILE;type=image/png" \
    "$API_URL/api/campaigns/$CAMPAIGN_ID/assets"
)"

ASSET_ID="$(printf "%s" "$ASSET" | python3 -c 'import json,sys; print(json.load(sys.stdin)["id"])')"
export ASSET_ID

curl -fsS \
  -H "Authorization: Bearer $TOKEN" \
  "$API_URL/api/campaigns/$CAMPAIGN_ID/assets" \
  > /tmp/dnd_phase8_assets.json

python3 -c 'import json,os; print(json.dumps({"asset_id": os.environ["ASSET_ID"]}))' > "$BACKGROUND_PAYLOAD"

UPDATED_SCENE="$(
  curl -fsS \
    -X PATCH \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    --data-binary "@$BACKGROUND_PAYLOAD" \
    "$API_URL/api/scenes/$SCENE_ID/background"
)"

printf "%s" "$UPDATED_SCENE" | python3 -c 'import json,sys; data=json.load(sys.stdin); assert data["background_asset_id"] is not None; assert data["background_url"] is not None'

curl -fsS \
  -H "Authorization: Bearer $TOKEN" \
  "$API_URL/api/assets/$ASSET_ID/content" \
  > "$ASSET_BODY"

python3 - <<'PY'
from pathlib import Path

content = Path("/tmp/dnd_phase8_asset_content.png").read_bytes()
assert len(content) > 0
assert content.startswith(b"\x89PNG")
PY

echo "phase8-smoke-ok"
echo "user=$EMAIL"
echo "campaign=$CAMPAIGN_ID"
echo "scene=$SCENE_ID"
echo "asset=$ASSET_ID"
