#!/usr/bin/env sh
set -eu

API_URL="${API_URL:-http://127.0.0.1:8091}"
EMAIL="phase7-$(date +%s)@dtmini.com"
export EMAIL

REGISTER_PAYLOAD="/tmp/dnd_phase7_register.json"
CAMPAIGN_PAYLOAD="/tmp/dnd_phase7_campaign.json"
CHARACTER_PAYLOAD="/tmp/dnd_phase7_character.json"
SCENE_PAYLOAD="/tmp/dnd_phase7_scene.json"
TOKEN_PAYLOAD="/tmp/dnd_phase7_token.json"
ENCOUNTER_PAYLOAD="/tmp/dnd_phase7_encounter.json"
COMBATANT_PAYLOAD="/tmp/dnd_phase7_combatant.json"
COMBATANT_UPDATE_PAYLOAD="/tmp/dnd_phase7_combatant_update.json"

python3 -c 'import json,os; print(json.dumps({"email": os.environ["EMAIL"], "display_name": "Phase Seven GM", "password": "phase7-password"}))' > "$REGISTER_PAYLOAD"

AUTH="$(
  curl -fsS \
    -H "Content-Type: application/json" \
    --data-binary "@$REGISTER_PAYLOAD" \
    "$API_URL/api/auth/register"
)"

TOKEN="$(printf "%s" "$AUTH" | python3 -c 'import json,sys; print(json.load(sys.stdin)["access_token"])')"

python3 -c 'import json; print(json.dumps({"name": "Phase 7 Campaign", "description": "Validation combat manager"}))' > "$CAMPAIGN_PAYLOAD"

CAMPAIGN="$(
  curl -fsS \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    --data-binary "@$CAMPAIGN_PAYLOAD" \
    "$API_URL/api/campaigns"
)"

CAMPAIGN_ID="$(printf "%s" "$CAMPAIGN" | python3 -c 'import json,sys; print(json.load(sys.stdin)["id"])')"
export CAMPAIGN_ID

python3 -c 'import json; print(json.dumps({"name": "Mira Initiative", "ancestry": "Elf", "class_name": "Rogue", "level": 4, "armor_class": 15, "speed": 30, "hp_current": 27, "hp_max": 27}))' > "$CHARACTER_PAYLOAD"

CHARACTER="$(
  curl -fsS \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    --data-binary "@$CHARACTER_PAYLOAD" \
    "$API_URL/api/campaigns/$CAMPAIGN_ID/characters"
)"

CHARACTER_ID="$(printf "%s" "$CHARACTER" | python3 -c 'import json,sys; print(json.load(sys.stdin)["id"])')"
export CHARACTER_ID

python3 -c 'import json; print(json.dumps({"name": "Initiative Room", "description": "Phase 7 scene", "grid_size": 50, "width": 1200, "height": 800, "is_active": True}))' > "$SCENE_PAYLOAD"

SCENE="$(
  curl -fsS \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    --data-binary "@$SCENE_PAYLOAD" \
    "$API_URL/api/campaigns/$CAMPAIGN_ID/scenes"
)"

SCENE_ID="$(printf "%s" "$SCENE" | python3 -c 'import json,sys; print(json.load(sys.stdin)["id"])')"
export SCENE_ID

python3 -c 'import json,os; print(json.dumps({"character_id": os.environ["CHARACTER_ID"], "name": "Mira", "x": 100, "y": 100, "size": 1, "color": "#7c3aed"}))' > "$TOKEN_PAYLOAD"

TOKEN_RESPONSE="$(
  curl -fsS \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    --data-binary "@$TOKEN_PAYLOAD" \
    "$API_URL/api/scenes/$SCENE_ID/tokens"
)"

TOKEN_ID="$(printf "%s" "$TOKEN_RESPONSE" | python3 -c 'import json,sys; print(json.load(sys.stdin)["id"])')"
export TOKEN_ID

python3 -c 'import json,os; print(json.dumps({"name": "Goblin Ambush", "scene_id": os.environ["SCENE_ID"]}))' > "$ENCOUNTER_PAYLOAD"

ENCOUNTER="$(
  curl -fsS \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    --data-binary "@$ENCOUNTER_PAYLOAD" \
    "$API_URL/api/campaigns/$CAMPAIGN_ID/encounters"
)"

ENCOUNTER_ID="$(printf "%s" "$ENCOUNTER" | python3 -c 'import json,sys; print(json.load(sys.stdin)["id"])')"
export ENCOUNTER_ID

python3 -c 'import json,os; print(json.dumps({"token_id": os.environ["TOKEN_ID"], "character_id": os.environ["CHARACTER_ID"], "name": "Mira", "initiative": 18, "armor_class": 15, "hp_current": 27, "hp_max": 27, "is_player_controlled": True}))' > "$COMBATANT_PAYLOAD"

COMBATANT="$(
  curl -fsS \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    --data-binary "@$COMBATANT_PAYLOAD" \
    "$API_URL/api/encounters/$ENCOUNTER_ID/combatants"
)"

COMBATANT_ID="$(printf "%s" "$COMBATANT" | python3 -c 'import json,sys; print(json.load(sys.stdin)["id"])')"
export COMBATANT_ID

curl -fsS \
  -X POST \
  -H "Authorization: Bearer $TOKEN" \
  "$API_URL/api/encounters/$ENCOUNTER_ID/start" \
  > /tmp/dnd_phase7_started.json

curl -fsS \
  -X POST \
  -H "Authorization: Bearer $TOKEN" \
  "$API_URL/api/encounters/$ENCOUNTER_ID/next-turn" \
  > /tmp/dnd_phase7_next_turn.json

python3 -c 'import json; print(json.dumps({"hp_current": 12, "conditions": ["poisoned"]}))' > "$COMBATANT_UPDATE_PAYLOAD"

curl -fsS \
  -X PATCH \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  --data-binary "@$COMBATANT_UPDATE_PAYLOAD" \
  "$API_URL/api/combatants/$COMBATANT_ID" \
  > /tmp/dnd_phase7_combatant_updated.json

curl -fsS \
  -H "Authorization: Bearer $TOKEN" \
  "$API_URL/api/encounters/$ENCOUNTER_ID" \
  > /tmp/dnd_phase7_encounter_detail.json

curl -fsS \
  -X POST \
  -H "Authorization: Bearer $TOKEN" \
  "$API_URL/api/encounters/$ENCOUNTER_ID/end" \
  > /tmp/dnd_phase7_ended.json

echo "phase7-smoke-ok"
echo "user=$EMAIL"
echo "campaign=$CAMPAIGN_ID"
echo "scene=$SCENE_ID"
echo "token=$TOKEN_ID"
echo "encounter=$ENCOUNTER_ID"
echo "combatant=$COMBATANT_ID"
