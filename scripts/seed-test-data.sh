#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# Seed test data for E2E smoke tests.
#
# Required env vars (set by CI from secrets):
#   TEST_EMAIL          — email for the test GM account
#   TEST_PASSWORD       — password (must have upper, lower, digit, 8+ chars)
#   TEST_CAMPAIGN_NAME  — optional, defaults to "Smoke Test Campaign"
#
# This script:
#   1. Registers a GM user (or logs in if already exists)
#   2. Creates a campaign
#   3. Creates a scene in that campaign
#   4. Places a token on the scene
#
# All calls target the backend running inside docker-compose on port 8091.
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

BACKEND_BASE="${BACKEND_BASE:-http://localhost:8091}"
CAMPAIGN_NAME="${TEST_CAMPAIGN_NAME:-Smoke Test Campaign}"
SCENE_NAME="Smoke Scene"
TOKEN_NAME="Goblin"

# ── helpers ─────────────────────────────────────────────────────────────────
log()  { printf '[seed] %s\n' "$*" >&2; }
fail() { log "FATAL: $*"; exit 1; }

# ── 1. Register or login ────────────────────────────────────────────────────
log "Registering test GM user ${TEST_EMAIL}…"

REGISTER_RESP=$(curl -sS -w '\n%{http_code}' -X POST "${BACKEND_BASE}/api/auth/register" \
  -H 'Content-Type: application/json' \
  -d "$(cat <<EOF
{
  "email": "${TEST_EMAIL}",
  "display_name": "Smoke Tester",
  "password": "${TEST_PASSWORD}",
  "confirm_password": "${TEST_PASSWORD}",
  "account_type": "gm",
  "website": ""
}
EOF
)")

HTTP_CODE=$(echo "$REGISTER_RESP" | tail -1)
BODY=$(echo "$REGISTER_RESP" | sed '$d')

if [ "$HTTP_CODE" = "201" ]; then
  log "User registered successfully."
  TOKEN=$(echo "$BODY" | jq -r '.access_token')
elif [ "$HTTP_CODE" = "409" ]; then
  log "User already exists — logging in…"
  LOGIN_RESP=$(curl -sS -X POST "${BACKEND_BASE}/api/auth/login" \
    -H 'Content-Type: application/json' \
    -d "{\"email\": \"${TEST_EMAIL}\", \"password\": \"${TEST_PASSWORD}\"}")
  TOKEN=$(echo "$LOGIN_RESP" | jq -r '.access_token')
  if [ -z "$TOKEN" ] || [ "$TOKEN" = "null" ]; then
    fail "Login failed: $LOGIN_RESP"
  fi
else
  fail "Registration failed (HTTP ${HTTP_CODE}): $BODY"
fi

if [ -z "$TOKEN" ] || [ "$TOKEN" = "null" ]; then
  fail "Failed to obtain auth token."
fi
log "Auth token obtained (${#TOKEN} chars)."

AUTH_HEADER="Authorization: Bearer ${TOKEN}"

# ── 2. Check if campaign already exists (idempotent) ─────────────────────────
log "Checking for existing test campaign…"
EXISTING_CAMPAIGN=$(curl -sS "${BACKEND_BASE}/api/campaigns" \
  -H "$AUTH_HEADER" \
  -H 'Content-Type: application/json' | \
  jq -r --arg name "$CAMPAIGN_NAME" '.[] | select(.name == $name) | .id // empty')

if [ -n "$EXISTING_CAMPAIGN" ]; then
  CAMPAIGN_ID="$EXISTING_CAMPAIGN"
  log "Campaign already exists: ${CAMPAIGN_ID}"
else
  log "Creating test campaign '${CAMPAIGN_NAME}'…"
  CAMPAIGN_RESP=$(curl -sS -X POST "${BACKEND_BASE}/api/campaigns" \
    -H "$AUTH_HEADER" \
    -H 'Content-Type: application/json' \
    -d "{\"name\": \"${CAMPAIGN_NAME}\", \"description\": \"Campagne pour tests smoke CI.\"}")
  CAMPAIGN_ID=$(echo "$CAMPAIGN_RESP" | jq -r '.id // empty')
  if [ -z "$CAMPAIGN_ID" ] || [ "$CAMPAIGN_ID" = "null" ]; then
    fail "Failed to create campaign: $CAMPAIGN_RESP"
  fi
  log "Campaign created: ${CAMPAIGN_ID}"
fi

# ── 3. Check if scene already exists ─────────────────────────────────────────
log "Checking for existing test scene…"
EXISTING_SCENE=$(curl -sS "${BACKEND_BASE}/api/campaigns/${CAMPAIGN_ID}/scenes" \
  -H "$AUTH_HEADER" \
  -H 'Content-Type: application/json' | \
  jq -r --arg name "$SCENE_NAME" '.[] | select(.name == $name) | .id // empty')

if [ -n "$EXISTING_SCENE" ]; then
  SCENE_ID="$EXISTING_SCENE"
  log "Scene already exists: ${SCENE_ID}"
else
  log "Creating test scene '${SCENE_NAME}'…"
  SCENE_RESP=$(curl -sS -X POST "${BACKEND_BASE}/api/campaigns/${CAMPAIGN_ID}/scenes" \
    -H "$AUTH_HEADER" \
    -H 'Content-Type: application/json' \
    -d "{\"name\": \"${SCENE_NAME}\", \"description\": \"Scene pour tests smoke.\", \"grid_size\": 50, \"width\": 1600, \"height\": 1000, \"is_active\": true}")
  SCENE_ID=$(echo "$SCENE_RESP" | jq -r '.id // empty')
  if [ -z "$SCENE_ID" ] || [ "$SCENE_ID" = "null" ]; then
    fail "Failed to create scene: $SCENE_RESP"
  fi
  log "Scene created: ${SCENE_ID}"
fi

# ── 4. Create a token on the scene ───────────────────────────────────────────
log "Checking for existing test token…"
EXISTING_TOKEN=$(curl -sS "${BACKEND_BASE}/api/scenes/${SCENE_ID}/tokens" \
  -H "$AUTH_HEADER" \
  -H 'Content-Type: application/json' | \
  jq -r --arg name "$TOKEN_NAME" '.[] | select(.name == $name) | .id // empty')

if [ -n "$EXISTING_TOKEN" ]; then
  TOKEN_ID="$EXISTING_TOKEN"
  log "Token already exists: ${TOKEN_ID}"
else
  log "Creating test token '${TOKEN_NAME}'…"
  TOKEN_RESP=$(curl -sS -X POST "${BACKEND_BASE}/api/scenes/${SCENE_ID}/tokens" \
    -H "$AUTH_HEADER" \
    -H 'Content-Type: application/json' \
    -d "{\"name\": \"${TOKEN_NAME}\", \"x\": 400, \"y\": 400, \"size\": 1, \"color\": \"#e74c3c\", \"vision_radius\": 60}")
  TOKEN_ID=$(echo "$TOKEN_RESP" | jq -r '.id // empty')
  if [ -z "$TOKEN_ID" ] || [ "$TOKEN_ID" = "null" ]; then
    fail "Failed to create token: $TOKEN_RESP"
  fi
  log "Token created: ${TOKEN_ID}"
fi

# ── Export campaign ID for downstream steps ──────────────────────────────────
echo "campaign_id=${CAMPAIGN_ID}"
log "Seed complete — campaign=${CAMPAIGN_ID} scene=${SCENE_ID} token=${TOKEN_ID}"
