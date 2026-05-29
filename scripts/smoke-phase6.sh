#!/usr/bin/env sh
set -eu

API_URL="${API_URL:-http://127.0.0.1:8091}"
EMAIL="phase6-$(date +%s)@dtmini.com"
export EMAIL

REGISTER_PAYLOAD="/tmp/dnd_phase6_register.json"
CAMPAIGN_PAYLOAD="/tmp/dnd_phase6_campaign.json"
CHARACTER_PAYLOAD="/tmp/dnd_phase6_character.json"
SCENE_PAYLOAD="/tmp/dnd_phase6_scene.json"
TOKEN_PAYLOAD="/tmp/dnd_phase6_token.json"
TOKEN_UPDATE_PAYLOAD="/tmp/dnd_phase6_token_update.json"

python3 -c 'import json,os; print(json.dumps({"email": os.environ["EMAIL"], "display_name": "Phase Six GM", "password": "phase6-password"}))' >"$REGISTER_PAYLOAD"

AUTH="$(
  curl -fsS \
    -H "Content-Type: application/json" \
    --data-binary "@$REGISTER_PAYLOAD" \
    "$API_URL/api/auth/register"
)"

TOKEN="$(printf "%s" "$AUTH" | python3 -c 'import json,sys; print(json.load(sys.stdin)["access_token"])')"

python3 -c 'import json; print(json.dumps({"name": "Phase 6 Campaign", "description": "Validation VTT minimal"}))' >"$CAMPAIGN_PAYLOAD"

CAMPAIGN="$(
  curl -fsS \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    --data-binary "@$CAMPAIGN_PAYLOAD" \
    "$API_URL/api/campaigns"
)"

CAMPAIGN_ID="$(printf "%s" "$CAMPAIGN" | python3 -c 'import json,sys; print(json.load(sys.stdin)["id"])')"

python3 -c 'import json; print(json.dumps({"name": "Aldren Tokenbearer", "ancestry": "Human", "class_name": "Fighter", "level": 3, "armor_class": 16, "speed": 30, "hp_current": 24, "hp_max": 24}))' >"$CHARACTER_PAYLOAD"

CHARACTER="$(
  curl -fsS \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    --data-binary "@$CHARACTER_PAYLOAD" \
    "$API_URL/api/campaigns/$CAMPAIGN_ID/characters"
)"

CHARACTER_ID="$(printf "%s" "$CHARACTER" | python3 -c 'import json,sys; print(json.load(sys.stdin)["id"])')"
export CHARACTER_ID

python3 -c 'import json; print(json.dumps({"name": "First Battle Map", "description": "Minimal grid scene", "grid_size": 50, "width": 1200, "height": 800, "is_active": True}))' >"$SCENE_PAYLOAD"

SCENE="$(
  curl -fsS \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    --data-binary "@$SCENE_PAYLOAD" \
    "$API_URL/api/campaigns/$CAMPAIGN_ID/scenes"
)"

SCENE_ID="$(printf "%s" "$SCENE" | python3 -c 'import json,sys; print(json.load(sys.stdin)["id"])')"

curl -fsS \
  -H "Authorization: Bearer $TOKEN" \
  "$API_URL/api/campaigns/$CAMPAIGN_ID/scenes" \
  >/tmp/dnd_phase6_scenes.json

python3 -c 'import json,os; print(json.dumps({"character_id": os.environ["CHARACTER_ID"], "name": "Aldren", "x": 100, "y": 150, "size": 1, "color": "#7c3aed"}))' >"$TOKEN_PAYLOAD"

TOKEN_RESPONSE="$(
  CHARACTER_ID="$CHARACTER_ID" curl -fsS \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    --data-binary "@$TOKEN_PAYLOAD" \
    "$API_URL/api/scenes/$SCENE_ID/tokens"
)"

TOKEN_ID="$(printf "%s" "$TOKEN_RESPONSE" | python3 -c 'import json,sys; print(json.load(sys.stdin)["id"])')"

python3 -c 'import json; print(json.dumps({"x": 250, "y": 300}))' >"$TOKEN_UPDATE_PAYLOAD"

curl -fsS \
  -X PATCH \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  --data-binary "@$TOKEN_UPDATE_PAYLOAD" \
  "$API_URL/api/tokens/$TOKEN_ID" \
  >/tmp/dnd_phase6_token_updated.json

curl -fsS \
  -H "Authorization: Bearer $TOKEN" \
  "$API_URL/api/scenes/$SCENE_ID/tokens" \
  >/tmp/dnd_phase6_tokens.json

echo "phase6-smoke-ok"
echo "user=$EMAIL"
echo "campaign=$CAMPAIGN_ID"
echo "character=$CHARACTER_ID"
echo "scene=$SCENE_ID"
echo "token=$TOKEN_ID"
