#!/usr/bin/env sh
set -eu

API_URL="${API_URL:-http://127.0.0.1:8091}"
EMAIL="phase9-$(date +%s)@dtmini.com"
export EMAIL

REGISTER_PAYLOAD="/tmp/dnd_phase9_register.json"
CAMPAIGN_PAYLOAD="/tmp/dnd_phase9_campaign.json"
SCENE_PAYLOAD="/tmp/dnd_phase9_scene.json"
TOKEN_PAYLOAD="/tmp/dnd_phase9_token.json"
MOVE_PAYLOAD="/tmp/dnd_phase9_move.json"
SETTINGS_PAYLOAD="/tmp/dnd_phase9_settings.json"

python3 -c 'import json,os; print(json.dumps({"email": os.environ["EMAIL"], "display_name": "Phase Nine GM", "password": "phase9-password"}))' > "$REGISTER_PAYLOAD"

AUTH="$(
  curl -fsS \
    -H "Content-Type: application/json" \
    --data-binary "@$REGISTER_PAYLOAD" \
    "$API_URL/api/auth/register"
)"

TOKEN="$(printf "%s" "$AUTH" | python3 -c 'import json,sys; print(json.load(sys.stdin)["access_token"])')"

python3 -c 'import json; print(json.dumps({"name": "Phase 9 Campaign", "description": "UX carte avancée"}))' > "$CAMPAIGN_PAYLOAD"

CAMPAIGN="$(
  curl -fsS \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    --data-binary "@$CAMPAIGN_PAYLOAD" \
    "$API_URL/api/campaigns"
)"

CAMPAIGN_ID="$(printf "%s" "$CAMPAIGN" | python3 -c 'import json,sys; print(json.load(sys.stdin)["id"])')"
export CAMPAIGN_ID

# 1. Créer une scène avec snap_to_grid activé
python3 -c 'import json; print(json.dumps({"name": "Token UX Scene", "description": "Test snap_to_grid", "grid_size": 50, "width": 1200, "height": 800, "is_active": True}))' > "$SCENE_PAYLOAD"

SCENE="$(
  curl -fsS \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    --data-binary "@$SCENE_PAYLOAD" \
    "$API_URL/api/campaigns/$CAMPAIGN_ID/scenes"
)"

SCENE_ID="$(printf "%s" "$SCENE" | python3 -c 'import json,sys; print(json.load(sys.stdin)["id"])')"
export SCENE_ID

# Vérifier snap_to_grid par défaut (true)
printf "%s" "$SCENE" | python3 -c 'import json,sys; data=json.load(sys.stdin); assert data["snap_to_grid"] == True, f"Expected snap_to_grid=True, got {data.get(\"snap_to_grid\")}"'

# 2. Créer un token
python3 -c 'import json; print(json.dumps({"name": "Hero", "x": 100, "y": 200, "size": 1, "color": "#7c3aed", "is_hidden": False}))' > "$TOKEN_PAYLOAD"

CREATED_TOKEN="$(
  curl -fsS \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    --data-binary "@$TOKEN_PAYLOAD" \
    "$API_URL/api/scenes/$SCENE_ID/tokens"
)"

TOKEN_ID="$(printf "%s" "$CREATED_TOKEN" | python3 -c 'import json,sys; print(json.load(sys.stdin)["id"])')"
export TOKEN_ID

# Vérifier position initiale
printf "%s" "$CREATED_TOKEN" | python3 -c 'import json,sys; data=json.load(sys.stdin); assert data["x"] == 100; assert data["y"] == 200'

# 3. Déplacer le token via PATCH /tokens/{id}/move
python3 -c 'import json; print(json.dumps({"x": 350, "y": 420}))' > "$MOVE_PAYLOAD"

MOVED_TOKEN="$(
  curl -fsS \
    -X PATCH \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    --data-binary "@$MOVE_PAYLOAD" \
    "$API_URL/api/tokens/$TOKEN_ID/move"
)"

# Vérifier nouvelle position
printf "%s" "$MOVED_TOKEN" | python3 -c 'import json,sys; data=json.load(sys.stdin); assert data["x"] == 350, f"Expected x=350, got {data[\"x\"]}"; assert data["y"] == 420, f"Expected y=420, got {data[\"y\"]}"'

# 4. Désactiver snap_to_grid via PATCH /scenes/{id}/settings
python3 -c 'import json; print(json.dumps({"snap_to_grid": False, "grid_size": 75}))' > "$SETTINGS_PAYLOAD"

UPDATED_SCENE="$(
  curl -fsS \
    -X PATCH \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    --data-binary "@$SETTINGS_PAYLOAD" \
    "$API_URL/api/scenes/$SCENE_ID/settings"
)"

# Vérifier settings mis à jour
printf "%s" "$UPDATED_SCENE" | python3 -c 'import json,sys; data=json.load(sys.stdin); assert data["snap_to_grid"] == False, "Expected snap_to_grid=False"; assert data["grid_size"] == 75, "Expected grid_size=75"'

# 5. Modifier view_zoom et view_pan
python3 -c 'import json; print(json.dumps({"view_zoom": 1.5, "view_pan_x": 100, "view_pan_y": -50}))' > "$SETTINGS_PAYLOAD"

PANNED_SCENE="$(
  curl -fsS \
    -X PATCH \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    --data-binary "@$SETTINGS_PAYLOAD" \
    "$API_URL/api/scenes/$SCENE_ID/settings"
)"

printf "%s" "$PANNED_SCENE" | python3 -c 'import json,sys; data=json.load(sys.stdin); assert data["view_zoom"] == 1.5, "Expected view_zoom=1.5"; assert data["view_pan_x"] == 100; assert data["view_pan_y"] == -50'

# 6. Re-déplacer le token après changement de settings
python3 -c 'import json; print(json.dumps({"x": 600, "y": 300}))' > "$MOVE_PAYLOAD"

curl -fsS \
  -X PATCH \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  --data-binary "@$MOVE_PAYLOAD" \
  "$API_URL/api/tokens/$TOKEN_ID/move" \
  > /dev/null

echo "phase9-smoke-ok"
echo "user=$EMAIL"
echo "campaign=$CAMPAIGN_ID"
echo "scene=$SCENE_ID"
echo "token=$TOKEN_ID"
