#!/usr/bin/env sh
set -eu

API_URL="${API_URL:-http://127.0.0.1:8091}"
FRONTEND_URL="${FRONTEND_URL:-http://127.0.0.1:8090}"
EMAIL="phase2-$(date +%s)@dtmini.com"
export EMAIL
REGISTER_PAYLOAD="/tmp/dnd_phase2_register.json"
CAMPAIGN_PAYLOAD="/tmp/dnd_phase2_campaign.json"

python3 -c 'import json,os; print(json.dumps({"email": os.environ["EMAIL"], "display_name": "Phase Two GM", "password": "phase2-password"}))' >"$REGISTER_PAYLOAD"

AUTH="$(
  curl -fsS \
    -H "Content-Type: application/json" \
    --data-binary "@$REGISTER_PAYLOAD" \
    "$API_URL/api/auth/register"
)"

TOKEN="$(printf "%s" "$AUTH" | python3 -c 'import json,sys; print(json.load(sys.stdin)["access_token"])')"

curl -fsS -H "Authorization: Bearer $TOKEN" "$API_URL/api/auth/me" >/tmp/dnd_phase2_me.json

python3 -c 'import json; print(json.dumps({"name": "One-shot Phase 2", "description": "Validation auth et campagnes"}))' >"$CAMPAIGN_PAYLOAD"

CAMPAIGN="$(
  curl -fsS \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    --data-binary "@$CAMPAIGN_PAYLOAD" \
    "$API_URL/api/campaigns"
)"

CAMPAIGN_ID="$(printf "%s" "$CAMPAIGN" | python3 -c 'import json,sys; print(json.load(sys.stdin)["id"])')"

curl -fsS \
  -H "Authorization: Bearer $TOKEN" \
  "$API_URL/api/campaigns/$CAMPAIGN_ID/members" \
  >/tmp/dnd_phase2_members.json

curl -fsS \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"role":"player","expires_in_days":14,"max_uses":10}' \
  "$API_URL/api/campaigns/$CAMPAIGN_ID/invites" \
  >/tmp/dnd_phase2_invite.json

curl -fsS "$FRONTEND_URL" >/tmp/dnd_phase2_frontend.html

echo "phase2-smoke-ok"
echo "user=$EMAIL"
echo "campaign=$CAMPAIGN_ID"
