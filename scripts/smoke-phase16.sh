#!/usr/bin/env bash
set -euo pipefail
API="${API:-http://127.0.0.1:8091/api}"
EMAIL="smoke-fog-$(date +%s)@test.com"
PASS="SmokePass123!"
echo "=== Phase 16 Smoke: Fog of War ==="

REG=$(curl -fsS -X POST "$API/auth/register" -H "Content-Type: application/json" -d "{\"email\":\"$EMAIL\",\"display_name\":\"FogTester\",\"password\":\"$PASS\",\"confirm_password\":\"$PASS\"}")
TOKEN=$(echo "$REG" | jq -r '.access_token')

CAMP=$(curl -fsS -X POST "$API/campaigns" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{"name":"Fog Test Camp","description":"Phase 16 smoke"}')
CID=$(echo "$CAMP" | jq -r '.id')

SCENE=$(curl -fsS -X POST "$API/campaigns/$CID/scenes" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{"name":"Fog Scene","grid_size":50,"width":1200,"height":800,"is_active":true}')
SID=$(echo "$SCENE" | jq -r '.id')

FOG=$(curl -fsS "$API/scenes/$SID/fog" -H "Authorization: Bearer $TOKEN")
ZONES=$(echo "$FOG" | jq '.fog_zones | length')
echo "Initial zones: $ZONES (expected 0)"
[ "$ZONES" -eq 0 ] || { echo "FAIL: expected 0 zones"; exit 1; }

PATCH=$(curl -fsS -X PATCH "$API/scenes/$SID/fog" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{"fog_zones":[{"x":100,"y":100,"width":200,"height":150}]}')
ZONES2=$(echo "$PATCH" | jq '.fog_zones | length')
echo "After reveal: $ZONES2 (expected 1)"
[ "$ZONES2" -eq 1 ] || { echo "FAIL: expected 1 zone"; exit 1; }

FOG2=$(curl -fsS "$API/scenes/$SID/fog" -H "Authorization: Bearer $TOKEN")
ZONES3=$(echo "$FOG2" | jq '.fog_zones | length')
echo "Persisted zones: $ZONES3 (expected 1)"
[ "$ZONES3" -eq 1 ] || { echo "FAIL: expected 1 zone"; exit 1; }

echo ""
echo "phase16-smoke-ok"
