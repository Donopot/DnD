#!/usr/bin/env sh
set -eu

API_URL="${API_URL:-http://127.0.0.1:8091}"
EMAIL="phase10-$(date +%s)@dtmini.com"
export EMAIL

REG_PAYLOAD="/tmp/dnd_phase10_register.json"
CAMP_PAYLOAD="/tmp/dnd_phase10_campaign.json"
HO_PAYLOAD="/tmp/dnd_phase10_handout.json"
HO_UPDATE="/tmp/dnd_phase10_handout_update.json"
HO_REVEAL="/tmp/dnd_phase10_handout_reveal.json"

# 1. Register GM
python3 -c 'import json,os; print(json.dumps({"email": os.environ["EMAIL"], "display_name": "Phase Ten GM", "password": "phase10-password"}))' > "$REG_PAYLOAD"

AUTH="$(curl -fsS -H "Content-Type: application/json" --data-binary "@$REG_PAYLOAD" "$API_URL/api/auth/register")"
TOKEN="$(printf "%s" "$AUTH" | python3 -c 'import json,sys; print(json.load(sys.stdin)["access_token"])')"

# 2. Create campaign
python3 -c 'import json; print(json.dumps({"name": "Phase 10 Campaign", "description": "Handouts validation"}))' > "$CAMP_PAYLOAD"

CAMPAIGN="$(curl -fsS -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" --data-binary "@$CAMP_PAYLOAD" "$API_URL/api/campaigns")"
CAMPAIGN_ID="$(printf "%s" "$CAMPAIGN" | python3 -c 'import json,sys; print(json.load(sys.stdin)["id"])')"

# 3. Create public handout
python3 -c 'import json; print(json.dumps({"title": "Welcome to Phandalin", "content": "The town of Phandalin...", "visibility": "public"}))' > "$HO_PAYLOAD"

HO_PUBLIC="$(curl -fsS -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" --data-binary "@$HO_PAYLOAD" "$API_URL/api/campaigns/$CAMPAIGN_ID/handouts")"
HO_PUBLIC_ID="$(printf "%s" "$HO_PUBLIC" | python3 -c 'import json,sys; print(json.load(sys.stdin)["id"])')"

printf "%s" "$HO_PUBLIC" | python3 -c 'import json,sys; d=json.load(sys.stdin); assert d["visibility"]=="public"; assert d["is_revealed"]==False'

# 4. Create GM-only handout
python3 -c 'import json; print(json.dumps({"title": "Secret Trap Details", "content": "The trap is triggered by...", "visibility": "gm"}))' > "$HO_PAYLOAD"

HO_GM="$(curl -fsS -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" --data-binary "@$HO_PAYLOAD" "$API_URL/api/campaigns/$CAMPAIGN_ID/handouts")"
HO_GM_ID="$(printf "%s" "$HO_GM" | python3 -c 'import json,sys; print(json.load(sys.stdin)["id"])')"

# 5. Create players-only handout (not revealed yet)
python3 -c 'import json; print(json.dumps({"title": "Player Map", "content": "The map shows the dungeon...", "visibility": "players"}))' > "$HO_PAYLOAD"

HO_PLAYERS="$(curl -fsS -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" --data-binary "@$HO_PAYLOAD" "$API_URL/api/campaigns/$CAMPAIGN_ID/handouts")"
HO_PLAYERS_ID="$(printf "%s" "$HO_PLAYERS" | python3 -c 'import json,sys; print(json.load(sys.stdin)["id"])')"

# 6. Register a player
PLAYER_EMAIL="phase10-player-$(date +%s)@dtmini.com"
python3 -c "import json; print(json.dumps({\"email\": \"$PLAYER_EMAIL\", \"display_name\": \"Player\", \"password\": \"player-pass\"}))" > "$REG_PAYLOAD"
PLAYER_AUTH="$(curl -fsS -H "Content-Type: application/json" --data-binary "@$REG_PAYLOAD" "$API_URL/api/auth/register")"
PLAYER_TOKEN="$(printf "%s" "$PLAYER_AUTH" | python3 -c 'import json,sys; print(json.load(sys.stdin)["access_token"])')"

# 7. Create invite and join as player
python3 -c 'import json; print(json.dumps({"role": "player", "max_uses": 1}))' > /tmp/dnd_phase10_invite.json
INVITE="$(curl -fsS -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" --data-binary @/tmp/dnd_phase10_invite.json "$API_URL/api/campaigns/$CAMPAIGN_ID/invites")"
INVITE_TOKEN="$(printf "%s" "$INVITE" | python3 -c 'import json,sys; print(json.load(sys.stdin)["token"])')"
curl -fsS -X POST -H "Authorization: Bearer $PLAYER_TOKEN" "$API_URL/api/invites/$INVITE_TOKEN/join" > /dev/null

# 8. GM sees all 3 handouts
GM_LIST="$(curl -fsS -H "Authorization: Bearer $TOKEN" "$API_URL/api/campaigns/$CAMPAIGN_ID/handouts")"
GM_COUNT="$(printf "%s" "$GM_LIST" | python3 -c 'import json,sys; print(len(json.load(sys.stdin)))')"
[ "$GM_COUNT" = "3" ] || { echo "FAIL: GM should see 3 handouts, saw $GM_COUNT"; exit 1; }

# 9. Player sees only public handout (1)
PLAYER_LIST="$(curl -fsS -H "Authorization: Bearer $PLAYER_TOKEN" "$API_URL/api/campaigns/$CAMPAIGN_ID/handouts")"
PLAYER_COUNT="$(printf "%s" "$PLAYER_LIST" | python3 -c 'import json,sys; print(len(json.load(sys.stdin)))')"
[ "$PLAYER_COUNT" = "1" ] || { echo "FAIL: Player should see 1 handout, saw $PLAYER_COUNT"; exit 1; }

# 10. Player cannot access GM handout (404)
curl -fsS -H "Authorization: Bearer $PLAYER_TOKEN" "$API_URL/api/handouts/$HO_GM_ID" > /dev/null 2>&1 && { echo "FAIL: Player should not access GM handout"; exit 1; } || true

# 11. Reveal players-only handout
python3 -c 'import json; print(json.dumps({"is_revealed": True}))' > "$HO_REVEAL"
curl -fsS -X PATCH -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" --data-binary "@$HO_REVEAL" "$API_URL/api/handouts/$HO_PLAYERS_ID" > /dev/null

# 12. Player now sees 2 handouts (public + revealed players)
PLAYER_LIST="$(curl -fsS -H "Authorization: Bearer $PLAYER_TOKEN" "$API_URL/api/campaigns/$CAMPAIGN_ID/handouts")"
PLAYER_COUNT="$(printf "%s" "$PLAYER_LIST" | python3 -c 'import json,sys; print(len(json.load(sys.stdin)))')"
[ "$PLAYER_COUNT" = "2" ] || { echo "FAIL: Player should see 2 handouts after reveal, saw $PLAYER_COUNT"; exit 1; }

# 13. Update handout title
python3 -c 'import json; print(json.dumps({"title": "Updated Welcome"}))' > "$HO_UPDATE"
curl -fsS -X PATCH -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" --data-binary "@$HO_UPDATE" "$API_URL/api/handouts/$HO_PUBLIC_ID" > /dev/null

# 14. Delete a handout
curl -fsS -X DELETE -H "Authorization: Bearer $TOKEN" "$API_URL/api/handouts/$HO_GM_ID" -o /dev/null -w "%{http_code}" | grep -q 204

# 15. GM now sees 2 handouts
GM_LIST="$(curl -fsS -H "Authorization: Bearer $TOKEN" "$API_URL/api/campaigns/$CAMPAIGN_ID/handouts")"
GM_COUNT="$(printf "%s" "$GM_LIST" | python3 -c 'import json,sys; print(len(json.load(sys.stdin)))')"
[ "$GM_COUNT" = "2" ] || { echo "FAIL: GM should see 2 handouts after delete, saw $GM_COUNT"; exit 1; }

echo "phase10-smoke-ok"
echo "user=$EMAIL"
echo "campaign=$CAMPAIGN_ID"
echo "ho_public=$HO_PUBLIC_ID"
echo "ho_players=$HO_PLAYERS_ID"
