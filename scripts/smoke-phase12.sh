#!/usr/bin/env bash
set -eu
API_URL="${API_URL:-http://127.0.0.1:8091}"
EMAIL="p12-$(date +%s)@dm.com"
export EMAIL

# Use python for all HTTP calls to avoid $() shell issues
python3 << 'PYEOF'
import json, os, subprocess, sys

API = os.environ.get("API_URL", "http://127.0.0.1:8091")
EMAIL = os.environ["EMAIL"]

def api(method, path, data=None, token=None):
    args = ["curl", "-fsS", "-X", method, f"{API}{path}"]
    if data:
        args += ["-H", "Content-Type: application/json", "--data-binary", "@-"]
    if token:
        args += ["-H", f"Authorization: Bearer ***       
    p = subprocess.run(args, input=data.encode() if data else None, capture_output=True, text=True)
    if p.returncode != 0:
        print(f"FAIL: {method} {path} -> {p.returncode}", file=sys.stderr)
        print(p.stderr, file=sys.stderr)
        sys.exit(1)
    return json.loads(p.stdout)

# Register
body = json.dumps({"email": EMAIL, "display_name": "GM12", "password": "p12-pass"})
auth = api("POST", "/api/auth/register", body)
tk = auth["access_token"]

# Campaign
camp = api("POST", "/api/campaigns", json.dumps({"name": "P12", "description": "Initiative"}), tk)
cid = camp["id"]

# Scene
scene = api("POST", f"/api/campaigns/{cid}/scenes", json.dumps({"name": "Arena", "grid_size": 50, "width": 1200, "height": 800}), tk)
sid = scene["id"]

# 3 tokens
for name in ["Aldric", "Goblin A", "Goblin B"]:
    api("POST", f"/api/scenes/{sid}/tokens", json.dumps({"name": name, "x": 100, "y": 100, "size": 1}), tk)

# From-scene
enc = api("POST", f"/api/scenes/{sid}/encounters/from-scene", json.dumps({"name": "Auto Fight"}), tk)
eid = enc["id"]
assert len(enc["combatants"]) == 3, f"Expected 3 combatants, got {len(enc['combatants'])}"
print("from-scene: 3 combatants OK")

# Roll initiative
enc = api("POST", f"/api/encounters/{eid}/roll-initiative", json.dumps({}), tk)
non_zero = sum(1 for c in enc["combatants"] if c["initiative"] > 0)
assert non_zero == 3, f"Expected 3 with init>0, got {non_zero}"
print("roll-initiative: 3/3 OK")

# Sort check
inits = [c["initiative"] for c in enc["combatants"]]
assert inits == sorted(inits, reverse=True), "Not sorted descending"
print("sort: descending OK")

# Reroll single
cb1 = enc["combatants"][0]["id"]
enc = api("POST", f"/api/encounters/{eid}/reroll-initiative", json.dumps({"combatant_ids": [cb1]}), tk)
cb1_init = next(c["initiative"] for c in enc["combatants"] if c["id"] == cb1)
assert cb1_init > 0, f"Reroll failed, got {cb1_init}"
print("reroll: single OK")

# Empty scene -> 400
empty = api("POST", f"/api/campaigns/{cid}/scenes", json.dumps({"name": "Empty", "grid_size": 50, "width": 1000, "height": 800}), tk)
eid2 = empty["id"]
try:
    api("POST", f"/api/scenes/{eid2}/encounters/from-scene", json.dumps({"name": "Fail"}), tk)
    print("FAIL: should have been 400")
    sys.exit(1)
except SystemExit:
    raise
except:
    pass
print("empty scene rejected OK")

print("phase12-smoke-ok")
print(f"campaign={cid}")
print(f"encounter={eid}")
PYEOF
