#!/usr/bin/env sh
set -eu

API_URL="${API_URL:-http://127.0.0.1:8091}"
FRONTEND_URL="${FRONTEND_URL:-http://127.0.0.1:8090}"
EMAIL="phase4-$(date +%s)@dtmini.com"
export EMAIL

REGISTER_PAYLOAD="/tmp/dnd_phase4_register.json"
CAMPAIGN_PAYLOAD="/tmp/dnd_phase4_campaign.json"
CHARACTER_PAYLOAD="/tmp/dnd_phase4_character.json"
ROLL_PAYLOAD="/tmp/dnd_phase4_roll.json"
NOTE_PAYLOAD="/tmp/dnd_phase4_note.json"

python3 -c 'import json,os; print(json.dumps({"email": os.environ["EMAIL"], "display_name": "Phase Four GM", "password": "phase4-password"}))' >"$REGISTER_PAYLOAD"

AUTH="$(
  curl -fsS \
    -H "Content-Type: application/json" \
    --data-binary "@$REGISTER_PAYLOAD" \
    "$API_URL/api/auth/register"
)"

TOKEN="$(printf "%s" "$AUTH" | python3 -c 'import json,sys; print(json.load(sys.stdin)["access_token"])')"

python3 -c 'import json; print(json.dumps({"name": "One-shot Phase 4", "description": "Validation des et journal"}))' >"$CAMPAIGN_PAYLOAD"

CAMPAIGN="$(
  curl -fsS \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    --data-binary "@$CAMPAIGN_PAYLOAD" \
    "$API_URL/api/campaigns"
)"

CAMPAIGN_ID="$(printf "%s" "$CAMPAIGN" | python3 -c 'import json,sys; print(json.load(sys.stdin)["id"])')"

python3 -c 'import json; print(json.dumps({
  "name": "Milo Deschance",
  "ancestry": "Halfelin",
  "class_name": "Roublard",
  "level": 2,
  "armor_class": 14,
  "speed": 25,
  "proficiency_bonus": 2,
  "hp_current": 15,
  "hp_max": 15,
  "attributes": {"str": 8, "dex": 16, "con": 12, "int": 13, "wis": 10, "cha": 14}
}))' >"$CHARACTER_PAYLOAD"

CHARACTER="$(
  curl -fsS \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    --data-binary "@$CHARACTER_PAYLOAD" \
    "$API_URL/api/campaigns/$CAMPAIGN_ID/characters"
)"

CHARACTER_ID="$(printf "%s" "$CHARACTER" | python3 -c 'import json,sys; print(json.load(sys.stdin)["id"])')"
export CHARACTER_ID

python3 -c 'import json,os; print(json.dumps({
  "formula": "1d20+5",
  "label": "Discretion",
  "mode": "advantage",
  "visibility": "public",
  "character_id": os.environ["CHARACTER_ID"]
}))' >"$ROLL_PAYLOAD"

ROLL="$(
  curl -fsS \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    --data-binary "@$ROLL_PAYLOAD" \
    "$API_URL/api/campaigns/$CAMPAIGN_ID/rolls"
)"

ROLL_ID="$(printf "%s" "$ROLL" | python3 -c 'import json,sys; print(json.load(sys.stdin)["id"])')"
ROLL_TOTAL="$(printf "%s" "$ROLL" | python3 -c 'import json,sys; print(json.load(sys.stdin)["total"])')"

python3 -c 'import json; print(json.dumps({"message": "Le groupe entre dans la taverne.", "visibility": "public"}))' >"$NOTE_PAYLOAD"

curl -fsS \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  --data-binary "@$NOTE_PAYLOAD" \
  "$API_URL/api/campaigns/$CAMPAIGN_ID/log" \
  >/tmp/dnd_phase4_note_response.json

curl -fsS \
  -H "Authorization: Bearer $TOKEN" \
  "$API_URL/api/campaigns/$CAMPAIGN_ID/rolls" \
  >/tmp/dnd_phase4_rolls.json

curl -fsS \
  -H "Authorization: Bearer $TOKEN" \
  "$API_URL/api/campaigns/$CAMPAIGN_ID/log" \
  >/tmp/dnd_phase4_log.json

curl -fsS "$FRONTEND_URL" >/tmp/dnd_phase4_frontend.html

echo "phase4-smoke-ok"
echo "user=$EMAIL"
echo "campaign=$CAMPAIGN_ID"
echo "character=$CHARACTER_ID"
echo "roll=$ROLL_ID"
echo "total=$ROLL_TOTAL"
