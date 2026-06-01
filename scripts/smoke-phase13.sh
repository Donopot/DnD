#!/usr/bin/env bash
set -eu
API_URL="${API_URL:-http://127.0.0.1:8091}"
EMAIL="p13-$(date +%s)@dm.com"
export EMAIL API_URL

python3 << 'PYEOF'
import json, os, subprocess, sys

API = os.environ.get("API_URL", "http://127.0.0.1:8091")
EMAIL = os.environ["EMAIL"]

def api(method, path, data=None, token=None):
    args = ["curl", "-fsS", "-X", method, f"{API}{path}",
            "-H", "Content-Type: application/json"]
    if token:
        args += ["-H", f"Authorization: Bearer ***       
    p = subprocess.run(args, input=(data or "").encode(), capture_output=True, text=True)
    if p.returncode != 0:
        print(f"FAIL: {method} {path} -> {p.returncode}", file=sys.stderr)
        print(p.stderr, file=sys.stderr)
        sys.exit(1)
    if not p.stdout.strip():
        return None
    return json.loads(p.stdout)

# Setup
auth = api("POST", "/api/auth/register", json.dumps({"email": EMAIL, "display_name": "GM13", "password": "p13"}))
tk = auth["access_token"]
cid = api("POST", "/api/campaigns", json.dumps({"name": "P13", "description": "Homebrew"}), tk)["id"]

# --- CREATURES ---
pre = f"/api/campaigns/{cid}/homebrew"

gob = api("POST", f"{pre}/creatures", json.dumps({
    "name": "Goblin", "type": "humanoid", "size": "small", "armor_class": 15, "hp_max": 7, "speed": 30,
    "attributes": {"str": 8, "dex": 14, "con": 10, "int": 10, "wis": 8, "cha": 8},
    "attacks": [{"name": "Scimitar", "hit": 4, "damage": "1d6+2"}], "challenge_rating": 0.25
}), tk)
assert gob["name"] == "Goblin" and gob["armor_class"] == 15
print("creature create OK")

# List
creatures = api("GET", f"{pre}/creatures", token=tk)
assert len(creatures) == 1
print("creature list OK")

# Update
upd = api("PATCH", f"/api/homebrew/creatures/{gob['id']}", json.dumps({"name": "Goblin Scout"}), tk)
assert upd["name"] == "Goblin Scout"
print("creature update OK")

# --- ITEMS ---
pot = api("POST", f"{pre}/items", json.dumps({
    "name": "Potion of Healing", "item_type": "potion", "rarity": "common",
    "properties": {"heal": "2d4+2"}
}), tk)
assert pot["name"] == "Potion of Healing"
print("item create OK")

items = api("GET", f"{pre}/items", token=tk)
assert len(items) == 1
print("item list OK")

# --- TO-TOKEN / TO-COMBATANT ---
sid = api("POST", f"/api/campaigns/{cid}/scenes", json.dumps({"name": "Dungeon", "grid_size": 50, "width": 1200, "height": 800}), tk)["id"]

token = api("POST", f"/api/homebrew/creatures/{gob['id']}/to-token", json.dumps({"scene_id": sid, "x": 200, "y": 300}), tk)
assert token["name"] == "Goblin Scout"
print("to-token OK")

eid = api("POST", f"/api/campaigns/{cid}/encounters", json.dumps({"name": "Ambush", "scene_id": sid}), tk)["id"]

cb = api("POST", f"/api/homebrew/creatures/{gob['id']}/to-combatant", json.dumps({"encounter_id": eid, "initiative": 12}), tk)
assert cb["name"] == "Goblin Scout" and cb["initiative"] == 12
print("to-combatant OK")

# --- EXPORT/IMPORT ---
exported = api("GET", f"{pre}/export", token=tk)
assert len(exported["creatures"]) == 1 and len(exported["items"]) == 1
print("export OK")

# Delete then re-import
api("DELETE", f"/api/homebrew/creatures/{gob['id']}", token=tk)
api("DELETE", f"/api/homebrew/items/{pot['id']}", token=tk)

result = api("POST", f"{pre}/import", json.dumps(exported), tk)
assert result["creatures"] == 1 and result["items"] == 1
print("import OK")

# Verify re-imported
creatures = api("GET", f"{pre}/creatures", token=tk)
assert len(creatures) == 1
items = api("GET", f"{pre}/items", token=tk)
assert len(items) == 1
print("re-import verification OK")

# --- PERMISSION: player can read ---
player_auth = api("POST", "/api/auth/register", json.dumps({"email": f"p13p-{EMAIL.split('@')[0]}@dm.com", "display_name": "P13Player", "password": "pp"}))
ptk = player_auth["access_token"]
inv = api("POST", f"/api/campaigns/{cid}/invites", json.dumps({"role": "player", "max_uses": 1}), tk)
api("POST", f"/api/invites/{inv['token']}/join", token=ptk)

creatures = api("GET", f"{pre}/creatures", token=ptk)
assert len(creatures) == 1
print("player read OK")

# Player cannot create
try:
    api("POST", f"{pre}/creatures", json.dumps({"name": "Hack"}), ptk)
    print("FAIL: player should not create")
    sys.exit(1)
except SystemExit: raise
except: pass
print("player create rejected OK")

print("phase13-smoke-ok")
print(f"campaign={cid}")
PYEOF
