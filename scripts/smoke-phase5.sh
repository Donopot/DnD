#!/usr/bin/env sh
set -eu

API_URL="${API_URL:-http://127.0.0.1:8091}"
EMAIL="phase5-$(date +%s)@dtmini.com"
export EMAIL

REGISTER_PAYLOAD="/tmp/dnd_phase5_register.json"
CAMPAIGN_PAYLOAD="/tmp/dnd_phase5_campaign.json"

python3 -c 'import json,os; print(json.dumps({"email": os.environ["EMAIL"], "display_name": "Phase Five GM", "password": "phase5-password"}))' >"$REGISTER_PAYLOAD"

AUTH="$(
  curl -fsS \
    -H "Content-Type: application/json" \
    --data-binary "@$REGISTER_PAYLOAD" \
    "$API_URL/api/auth/register"
)"

TOKEN="$(printf "%s" "$AUTH" | python3 -c 'import json,sys; print(json.load(sys.stdin)["access_token"])')"

python3 -c 'import json; print(json.dumps({"name": "One-shot Phase 5", "description": "Validation websocket temps reel"}))' >"$CAMPAIGN_PAYLOAD"

CAMPAIGN="$(
  curl -fsS \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    --data-binary "@$CAMPAIGN_PAYLOAD" \
    "$API_URL/api/campaigns"
)"

CAMPAIGN_ID="$(printf "%s" "$CAMPAIGN" | python3 -c 'import json,sys; print(json.load(sys.stdin)["id"])')"

docker compose exec -T \
  -e TOKEN="$TOKEN" \
  -e CAMPAIGN_ID="$CAMPAIGN_ID" \
  dnd-backend \
  python -c 'import asyncio, json, os, websockets

async def main():
    token = os.environ["TOKEN"]
    campaign_id = os.environ["CAMPAIGN_ID"]
    uri = f"ws://127.0.0.1:8000/ws/campaigns/{campaign_id}?token={token}"
    async with websockets.connect(uri) as websocket:
        first = json.loads(await asyncio.wait_for(websocket.recv(), timeout=5))
        assert first["type"] == "connected", first
        await websocket.send(json.dumps({"type": "ping"}))
        messages = [first]
        for _ in range(3):
            message = json.loads(await asyncio.wait_for(websocket.recv(), timeout=5))
            messages.append(message)
            if message.get("type") == "pong":
                break
        assert any(message.get("type") == "pong" for message in messages), messages

asyncio.run(main())'

echo "phase5-smoke-ok"
echo "user=$EMAIL"
echo "campaign=$CAMPAIGN_ID"

