#!/usr/bin/env sh
set -eu

API_URL="${API_URL:-http://127.0.0.1:8091}"
FRONTEND_URL="${FRONTEND_URL:-http://127.0.0.1:8090}"
EMAIL="phase3-$(date +%s)@dtmini.com"
export EMAIL

REGISTER_PAYLOAD="/tmp/dnd_phase3_register.json"
CAMPAIGN_PAYLOAD="/tmp/dnd_phase3_campaign.json"
CHARACTER_PAYLOAD="/tmp/dnd_phase3_character.json"
PATCH_PAYLOAD="/tmp/dnd_phase3_character_patch.json"
PATCH_RESPONSE="/tmp/dnd_phase3_character_patch_response.json"

python3 -c 'import json,os; print(json.dumps({"email": os.environ["EMAIL"], "display_name": "Phase Three GM", "password": "phase3-password"}))' >"$REGISTER_PAYLOAD"

AUTH="$(
  curl -fsS \
    -H "Content-Type: application/json" \
    --data-binary "@$REGISTER_PAYLOAD" \
    "$API_URL/api/auth/register"
)"

TOKEN="$(printf "%s" "$AUTH" | python3 -c 'import json,sys; print(json.load(sys.stdin)["access_token"])')"

python3 -c 'import json; print(json.dumps({"name": "One-shot Phase 3", "description": "Validation fiches personnages"}))' >"$CAMPAIGN_PAYLOAD"

CAMPAIGN="$(
  curl -fsS \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    --data-binary "@$CAMPAIGN_PAYLOAD" \
    "$API_URL/api/campaigns"
)"

CAMPAIGN_ID="$(printf "%s" "$CAMPAIGN" | python3 -c 'import json,sys; print(json.load(sys.stdin)["id"])')"

python3 -c 'import json; print(json.dumps({
  "name": "Ariane Forgeclair",
  "ancestry": "Humaine",
  "class_name": "Guerriere",
  "level": 3,
  "armor_class": 16,
  "speed": 30,
  "proficiency_bonus": 2,
  "hp_current": 28,
  "hp_max": 28,
  "attributes": {"str": 16, "dex": 12, "con": 14, "int": 10, "wis": 11, "cha": 13},
  "skills": {"athletics": {"proficient": True}},
  "saving_throws": {"str": {"proficient": True}, "con": {"proficient": True}},
  "attacks": [{"name": "Epee longue", "bonus": 5, "damage": "1d8+3"}],
  "inventory": [{"name": "Corde", "quantity": 1}],
  "spells": [],
  "resources": [{"name": "Second souffle", "current": 1, "max": 1}],
  "notes": "Fiche creee par le smoke test phase 3."
}))' >"$CHARACTER_PAYLOAD"

CHARACTER="$(
  curl -fsS \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    --data-binary "@$CHARACTER_PAYLOAD" \
    "$API_URL/api/campaigns/$CAMPAIGN_ID/characters"
)"

CHARACTER_ID="$(printf "%s" "$CHARACTER" | python3 -c 'import json,sys; print(json.load(sys.stdin)["id"])')"

curl -fsS \
  -H "Authorization: Bearer $TOKEN" \
  "$API_URL/api/campaigns/$CAMPAIGN_ID/characters" \
  >/tmp/dnd_phase3_characters.json

python3 -c 'import json; print(json.dumps({"hp_current": 21, "notes": "PV modifies par smoke test."}))' >"$PATCH_PAYLOAD"

curl -fsS \
  -X PATCH \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  --data-binary "@$PATCH_PAYLOAD" \
  "$API_URL/api/characters/$CHARACTER_ID" \
  >"$PATCH_RESPONSE"

curl -fsS "$FRONTEND_URL" >/tmp/dnd_phase3_frontend.html

echo "phase3-smoke-ok"
echo "user=$EMAIL"
echo "campaign=$CAMPAIGN_ID"
echo "character=$CHARACTER_ID"
