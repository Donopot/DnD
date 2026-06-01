#!/usr/bin/env bash
set -eu

API_URL="${API_URL:-http://127.0.0.1:8091}"
EMAIL="phase11-$(date +%s)@dtmini.com"

REG="/tmp/dnd_phase11_register.json"
CAMP="/tmp/dnd_phase11_campaign.json"
SCENE_F="/tmp/dnd_phase11_scene.json"
TOKEN_F="/tmp/dnd_phase11_token.json"
ENC_F="/tmp/dnd_phase11_encounter.json"
CB_F="/tmp/dnd_phase11_combatant.json"
APPLY_F="/tmp/dnd_phase11_apply.json"
REMOVE_F="/tmp/dnd_phase11_remove.json"

jqid() { jq -r '.id'; }
jqtok() { jq -r '.access_token'; }

# 1. Register
python3 -c "import json; print(json.dumps({'email': '$EMAIL', 'display_name': 'Phase 11 GM', 'password': 'phase11-pass'}))" > "$REG"

AUTH="$(curl -fsS -H "Content-Type: application/json" --data-binary "@$REG" "$API_URL/api/auth/register")"

TOKEN="$(echo "$AUTH" | jqtok)"

# 2. Campaign
python3 -c "import json; print(json.dumps({'name': 'Phase 11 Campaign', 'description': 'Conditions combat'}))" > "$CAMP"

CID="$(curl -fsS -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" --data-binary "@$CAMP" "$API_URL/api/campaigns" | jqid)"

# 3. Scene
python3 -c "import json; print(json.dumps({'name': 'Battle', 'grid_size': 50, 'width': 1200, 'height': 800}))" > "$SCENE_F"

SID="$(curl -fsS -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" --data-binary "@$SCENE_F" "$API_URL/api/campaigns/$CID/scenes" | jqid)"

# 4. Token
python3 -c "import json; print(json.dumps({'name': 'Goblin', 'x': 100, 'y': 100, 'size': 1}))" > "$TOKEN_F"

TID="$(curl -fsS -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" --data-binary "@$TOKEN_F" "$API_URL/api/scenes/$SID/tokens" | jqid)"

# 5. Encounter
python3 -c "import json; print(json.dumps({'name': 'Phase 11 Fight', 'scene_id': '$SID'}))" > "$ENC_F"

EID="$(curl -fsS -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" --data-binary "@$ENC_F" "$API_URL/api/campaigns/$CID/encounters" | jqid)"

# 6. Combatant
python3 -c "import json; print(json.dumps({'token_id': '$TID', 'name': 'Goblin Scout', 'initiative': 15, 'armor_class': 15, 'hp_max': 7, 'hp_current': 7}))" > "$CB_F"

CBID="$(curl -fsS -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" --data-binary "@$CB_F" "$API_URL/api/encounters/$EID/combatants" | jqid)"

# 7. Apply "Prone"
python3 -c "import json; print(json.dumps({'combatant_id': '$CBID', 'condition': {'name': 'Prone', 'duration': 1, 'duration_unit': 'rounds', 'is_concentration': False}}))" > "$APPLY_F"

CB_AFTER="$(curl -fsS -X POST -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" --data-binary "@$APPLY_F" "$API_URL/api/encounters/$EID/conditions/apply")"

echo "$CB_AFTER" | python3 -c "
import json, sys
d = json.load(sys.stdin)
conds = d['conditions']
assert any(c['name'] == 'Prone' for c in conds if isinstance(c, dict)), 'Prone not found'
print('Prone applied OK')
"

# 8. Apply "Poisoned"
python3 -c "import json; print(json.dumps({'combatant_id': '$CBID', 'condition': {'name': 'Poisoned', 'duration': 3, 'duration_unit': 'rounds', 'is_concentration': True, 'source': 'Spider bite'}}))" > "$APPLY_F"

CB_AFTER="$(curl -fsS -X POST -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" --data-binary "@$APPLY_F" "$API_URL/api/encounters/$EID/conditions/apply")"

echo "$CB_AFTER" | python3 -c "import json,sys; d=json.load(sys.stdin); assert len(d['conditions'])==2; print('2 conditions OK')"

# 9. Check combat log
LOG="$(curl -fsS -H "Authorization: Bearer $TOKEN" "$API_URL/api/encounters/$EID/log")"

LOG_COUNT="$(echo "$LOG" | jq '. | length')"
[ "$LOG_COUNT" -ge 2 ] || { echo "FAIL: log entries $LOG_COUNT < 2"; exit 1; }

echo "$LOG" | python3 -c "
import json, sys
entries = json.load(sys.stdin)
types = [e['event_type'] for e in entries]
assert 'condition_applied' in types, 'No condition_applied'
print('log contains condition_applied OK')
"

# 10. Remove "Prone"
python3 -c "import json; print(json.dumps({'combatant_id': '$CBID', 'condition_name': 'Prone'}))" > "$REMOVE_F"

CB_AFTER="$(curl -fsS -X POST -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" --data-binary "@$REMOVE_F" "$API_URL/api/encounters/$EID/conditions/remove")"

echo "$CB_AFTER" | python3 -c "
import json, sys
d = json.load(sys.stdin)
assert len(d['conditions']) == 1
assert d['conditions'][0]['name'] == 'Poisoned'
print('Prone removed OK')
"

# 11. Log after remove
LOG="$(curl -fsS -H "Authorization: Bearer $TOKEN" "$API_URL/api/encounters/$EID/log")"

LOG_COUNT="$(echo "$LOG" | jq '. | length')"
[ "$LOG_COUNT" -ge 3 ] || { echo "FAIL: log entries $LOG_COUNT < 3"; exit 1; }

echo "$LOG" | python3 -c "
import json, sys
entries = json.load(sys.stdin)
types = [e['event_type'] for e in entries]
assert 'condition_removed' in types, 'No condition_removed'
print('log contains condition_removed OK')
"

# 12. Duplicate should 409
curl -fsS -X POST -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" --data-binary "@$APPLY_F" "$API_URL/api/encounters/$EID/conditions/apply" > /dev/null 2>&1 && { echo "FAIL: duplicate should be 409"; exit 1; } || true

echo "phase11-smoke-ok"
echo "campaign=$CID"
echo "encounter=$EID"
echo "combatant=$CBID"
