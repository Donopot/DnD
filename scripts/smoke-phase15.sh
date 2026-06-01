#!/usr/bin/env bash
set -eu
API_URL="${API_URL:-http://127.0.0.1:8091}"
EMAIL="p15-$(date +%s)@dm.com"
export EMAIL API_URL

python3 << 'PYEOF'
import json, os, subprocess, sys

API = os.environ["API_URL"]
EMAIL = os.environ["EMAIL"]

def api(method, path, data=None, token=None):
    args = ["curl", "-fsS", "-X", method, f"{API}{path}", "-H", "Content-Type: application/json"]
    if token: args += ["-H", f"Authorization: Bearer ***       
    p = subprocess.run(args, input=(data or "").encode(), capture_output=True, text=True)
    if p.returncode != 0:
        print(f"FAIL: {method} {path} -> {p.returncode}", file=sys.stderr)
        print(p.stderr, file=sys.stderr)
        sys.exit(1)
    return json.loads(p.stdout) if p.stdout.strip() else None

# Setup
auth = api("POST", "/api/auth/register", json.dumps({"email": EMAIL, "display_name": "GM15", "password": "p15"}))
tk = auth["access_token"]
cid = api("POST", "/api/campaigns", json.dumps({"name": "P15", "description": "Journal"}), tk)["id"]
lp = f"/api/campaigns/{cid}/log"

# Create log entries
api("POST", f"{lp}", json.dumps({"message": "Session begins", "visibility": "public"}), tk)
api("POST", f"{lp}", json.dumps({"message": "Combat started", "visibility": "public"}), tk)
api("POST", f"{lp}", json.dumps({"message": "GM note: trap planned", "visibility": "gm"}), tk)

# Session marker
m = api("POST", f"{lp}/session-marker", json.dumps({"label": "Session 1"}), tk)
assert m["session_marker"] == True and m["pinned"] == True
print("1. session marker OK")

# List sessions
sessions = api("GET", f"{lp}/sessions", token=tk)
assert len(sessions) == 1 and sessions[0]["label"] == "Session 1"
print("2. sessions list OK")

# Filter by category
all_entries = api("GET", f"{lp}", token=tk)
cat_ids = [e["id"] for e in all_entries if e["entry_type"] == "note" and not e["session_marker"]]
assert len(cat_ids) >= 2

# Update category on first entry
cid1 = cat_ids[0]
upd = api("PATCH", f"/api/log-entries/{cid1}/category?category=combat", token=tk)
assert upd["category"] == "combat"
print("3. category update OK")

# Toggle pin
was_pinned = upd["pinned"]
pin_result = api("PATCH", f"/api/log-entries/{cid1}/pin", token=tk)
assert pin_result["pinned"] != was_pinned
print("4. pin toggle OK")

# Filter by category
filtered = api("GET", f"{lp}?category=combat", token=tk)
assert len(filtered) == 1 and filtered[0]["id"] == str(cid1)
print("5. category filter OK")

# Filter by pinned
api("PATCH", f"/api/log-entries/{cid1}/pin", token=tk)  # pin again
pinned = api("GET", f"{lp}?pinned=true", token=tk)
assert len(pinned) >= 2  # marker was auto-pinned + our pinned entry
print("6. pinned filter OK")

# Export markdown
export = api("GET", f"{lp}/export?format=markdown", token=tk)
assert export["format"] == "markdown"
assert "# Journal" in export["content"]
print("7. markdown export OK")

# Export JSON
export = api("GET", f"{lp}/export?format=json", token=tk)
assert isinstance(export, list) and len(export) >= 4
print("8. json export OK")

# Export filtered
export = api("GET", f"{lp}/export?format=json&category=combat", token=tk)
assert len(export) == 1
print("9. filtered export OK")

# Player can see sessions and export, but not GM entries
p_email = f"p15p-{EMAIL.split('@')[0]}@dm.com"
p_auth = api("POST", "/api/auth/register", json.dumps({"email": p_email, "display_name": "P15", "password": "pp"}))
ptk = p_auth["access_token"]
inv = api("POST", f"/api/campaigns/{cid}/invites", json.dumps({"role": "player", "max_uses": 1}), tk)
api("POST", f"/api/invites/{inv['token']}/join", token=ptk)

player_entries = api("GET", f"{lp}", token=ptk)
gm_entries = [e for e in player_entries if e["visibility"] == "gm"]
assert len(gm_entries) == 0, f"Player should not see GM entries, saw {len(gm_entries)}"
print("10. player visibility filtered OK")

print("phase15-smoke-ok")
print(f"campaign={cid}")
PYEOF
