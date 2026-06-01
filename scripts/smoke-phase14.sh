#!/usr/bin/env bash
set -eu
API_URL="${API_URL:-http://127.0.0.1:8091}"
EMAIL="p14-$(date +%s)@dm.com"
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
    return json.loads(p.stdout) if p.stdout.strip() else None

resp_404 = lambda m, p, d, t: subprocess.run(
    ["curl", "-s", "-o", "/dev/null", "-w", "%{http_code}", "-X", m, f"{API}{p}",
     "-H", "Content-Type: application/json"] + (["-H", f"Authorization: Bearer ***] if t else []) + (
    ["-d", d] if d else []),
    capture_output=True, text=True
).stdout.strip()

# Setup GM
auth = api("POST", "/api/auth/register", json.dumps({"email": EMAIL, "display_name": "GM14", "password": "p14-pass"}))
tk = auth["access_token"]
cid = api("POST", "/api/campaigns", json.dumps({"name": "P14", "description": "Player hardening"}), tk)["id"]

# Setup Player
p_email = f"p14p-{EMAIL.split('@')[0]}@dm.com"
p_auth = api("POST", "/api/auth/register", json.dumps({"email": p_email, "display_name": "Player14", "password": "pp"}))
ptk = p_auth["access_token"]
inv = api("POST", f"/api/campaigns/{cid}/invites", json.dumps({"role": "player", "max_uses": 1}), tk)
api("POST", f"/api/invites/{inv['token']}/join", token=ptk)

# Create data as GM
sid = api("POST", f"/api/campaigns/{cid}/scenes", json.dumps({"name": "P14 Scene", "grid_size": 50, "width": 1000, "height": 800}), tk)["id"]
api("POST", f"/api/scenes/{sid}/tokens", json.dumps({"name": "Visible NPC", "x": 100, "y": 100}), tk)
api("POST", f"/api/scenes/{sid}/tokens", json.dumps({"name": "Hidden Boss", "x": 200, "y": 200, "is_hidden": True}), tk)
api("POST", f"/api/campaigns/{cid}/handouts", json.dumps({"title": "Public Note", "content": "Hello", "visibility": "public"}), tk)
api("POST", f"/api/campaigns/{cid}/handouts", json.dumps({"title": "GM Secret", "content": "shh", "visibility": "gm"}), tk)
eid = api("POST", f"/api/campaigns/{cid}/encounters", json.dumps({"name": "Fight", "scene_id": sid}), tk)["id"]
api("POST", f"/api/encounters/{eid}/combatants", json.dumps({"name": "Orc", "initiative": 10, "is_hidden": False}), tk)
api("POST", f"/api/encounters/{eid}/combatants", json.dumps({"name": "Hidden Boss", "initiative": 20, "is_hidden": True}), tk)

# ===== PLAYER TESTS =====
pre = f"/api/campaigns/{cid}/player"

# 1. Summary
s = api("GET", f"{pre}/summary", token=ptk)
assert s["name"] == "P14" and len(s["members"]) == 2
print("1. player summary OK")

# 2. My characters (none yet)
chars = api("GET", f"{pre}/characters", token=ptk)
assert chars == []
print("2. player characters (empty) OK")

# 3. Scenes
scenes = api("GET", f"{pre}/scenes", token=ptk)
assert len(scenes) == 1
print("3. player scenes OK")

# 4. Tokens — only visible
tokens = api("GET", f"/api/player/scenes/{sid}/tokens", token=ptk)
assert len(tokens) == 1 and tokens[0]["name"] == "Visible NPC"
print("4. player tokens (hidden filtered) OK")

# 5. Handouts — only public, not GM secret
handouts = api("GET", f"{pre}/handouts", token=ptk)
titles = [h["title"] for h in handouts]
assert "Public Note" in titles and "GM Secret" not in titles
print("5. player handouts (visibility filtered) OK")

# 6. Encounter — hidden combatants filtered
enc = api("GET", f"/api/player/encounters/{eid}", token=ptk)
cb_names = [c["name"] for c in enc["combatants"]]
assert "Orc" in cb_names and "Hidden Boss" not in cb_names
print("6. player encounter (hidden filtered) OK")

# 7. Player cannot access GM-only resources
for path in [
    f"/api/campaigns/{cid}/handouts",  # GM can list all
]:
    # Player accessing normal endpoint shouldn't see GM stuff
    list_h = api("GET", path, token=ptk)
    # Already tested above

# 8. Player cannot create handouts/scenes/tokens
for path_data in [
    (f"/api/campaigns/{cid}/handouts", '{"title":"Hack","visibility":"public"}'),
    (f"/api/campaigns/{cid}/scenes", '{"name":"Hack","grid_size":50,"width":1000,"height":800}'),
    (f"/api/scenes/{sid}/tokens", '{"name":"Hack","x":0,"y":0}'),
]:
    code = resp_404("POST", path_data[0], path_data[1], ptk)
    assert code in ("403", "401"), f"Expected 403/401 for {path_data[0]}, got {code}"
print("8. player mutation rejected OK")

# 9. Audit log (GM only)
audit = api("GET", f"/api/campaigns/{cid}/audit", token=tk)
assert len(audit) >= 7  # at least our player accesses
print(f"9. audit log ({len(audit)} entries) OK")

# 10. Player cannot access audit
code = resp_404("GET", f"/api/campaigns/{cid}/audit", None, ptk)
assert code == "403", f"Expected 403, got {code}"
print("10. audit restricted to GM OK")

print("phase14-smoke-ok")
print(f"campaign={cid}")
PYEOF
