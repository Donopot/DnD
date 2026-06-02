#!/usr/bin/env sh
set -eu

cd "$(dirname "$0")/.."

python3 - <<'PY'
from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(".")
MAIN = ROOT / "backend/app/main.py"
ROUTERS_DIR = ROOT / "backend/app/routers"
SMOKE = ROOT / "scripts/smoke-backend.sh"

REQUIRED_ROUTERS = {
    "auth",
    "assets",
    "bestiary",
    "campaigns",
    "characters",
    "combat",
    "dungeon",
    "gm_notes",
    "handouts",
    "homebrew",
    "items",
    "messages",
    "npc_generator",
    "player",
    "session",
    "spells",
    "vtt",
}

REQUIRED_ENDPOINTS = {
    ("GET", "/api/health"),
    ("POST", "/api/auth/register"),
    ("POST", "/api/auth/login"),
    ("GET", "/api/auth/me"),
    ("GET", "/api/characters/mine"),
    ("POST", "/api/campaigns"),
    ("GET", "/api/campaigns"),
    ("GET", "/api/campaigns/{campaign_id}/members"),
    ("POST", "/api/campaigns/{campaign_id}/characters"),
    ("GET", "/api/campaigns/{campaign_id}/characters"),
    ("POST", "/api/campaigns/{campaign_id}/scenes"),
    ("GET", "/api/campaigns/{campaign_id}/scenes"),
    ("POST", "/api/scenes/{scene_id}/tokens"),
    ("GET", "/api/scenes/{scene_id}/tokens"),
    ("PATCH", "/api/tokens/{token_id}"),
    ("POST", "/api/campaigns/{campaign_id}/encounters"),
    ("POST", "/api/encounters/{encounter_id}/combatants"),
    ("POST", "/api/encounters/{encounter_id}/start"),
    ("POST", "/api/encounters/{encounter_id}/next-turn"),
}

REQUIRED_SMOKE_PATHS = {
    "/api/health",
    "/api/auth/register",
    "/api/auth/login",
    "/api/auth/me",
    "/api/characters/mine",
    "/api/campaigns",
    "/api/campaigns/$CAMPAIGN_ID/characters",
    "/api/campaigns/$CAMPAIGN_ID/scenes",
    "/api/scenes/$SCENE_ID/tokens",
    "/api/tokens/$SCENE_TOKEN_ID",
    "/api/campaigns/$CAMPAIGN_ID/encounters",
    "/api/encounters/$ENCOUNTER_ID/combatants",
    "/api/encounters/$ENCOUNTER_ID/start",
    "/api/encounters/$ENCOUNTER_ID/next-turn",
}


def fail(errors: list[str]) -> None:
    print("api-surface-check-failed")
    for error in errors:
        print(f"- {error}")
    sys.exit(1)


def normalize_path(path: str) -> str:
    path = re.sub(r"\{([a-zA-Z_][a-zA-Z0-9_]*)\}", r"{\1}", path)
    return re.sub(r"//+", "/", path)


def join_paths(prefix: str, route_path: str) -> str:
    if route_path == "/":
        return prefix or "/"
    return normalize_path(f"{prefix.rstrip('/')}/{route_path.lstrip('/')}")


def extract_router_prefix(content: str) -> str:
    match = re.search(r"APIRouter\(\s*prefix\s*=\s*[\"']([^\"']*)[\"']", content)
    return match.group(1) if match else ""


def extract_routes_from_file(path: Path) -> set[tuple[str, str]]:
    content = path.read_text(encoding="utf-8")
    prefix = extract_router_prefix(content)
    routes: set[tuple[str, str]] = set()

    for match in re.finditer(
        r"@(?:router|ws_router)\.(get|post|put|patch|delete|websocket)\(\s*[\"']([^\"']+)[\"']",
        content,
    ):
        method = match.group(1).upper()
        route_path = match.group(2)
        if method == "WEBSOCKET":
            method = "WS"
        routes.add((method, join_paths(prefix, route_path)))

    return routes


def extract_app_routes(content: str) -> set[tuple[str, str]]:
    routes: set[tuple[str, str]] = set()

    for match in re.finditer(
        r"@app\.(get|post|put|patch|delete|websocket)\(\s*[\"']([^\"']+)[\"']",
        content,
    ):
        method = match.group(1).upper()
        route_path = match.group(2)
        if method == "WEBSOCKET":
            method = "WS"
        routes.add((method, normalize_path(route_path)))

    return routes


errors: list[str] = []

if not MAIN.exists():
    fail([f"Fichier manquant: {MAIN}"])

if not ROUTERS_DIR.exists():
    fail([f"Dossier manquant: {ROUTERS_DIR}"])

main_text = MAIN.read_text(encoding="utf-8")

included_routers = set(re.findall(r"app\.include_router\(([a-zA-Z_][a-zA-Z0-9_]*)\.router\)", main_text))
included_ws_routers = set(re.findall(r"app\.include_router\(([a-zA-Z_][a-zA-Z0-9_]*)\.ws_router\)", main_text))

missing_routers = sorted(REQUIRED_ROUTERS - included_routers)
if missing_routers:
    errors.append(f"Routers requis non inclus dans main.py: {', '.join(missing_routers)}")

for router_name in sorted(included_routers):
    router_file = ROUTERS_DIR / f"{router_name}.py"
    if not router_file.exists():
        errors.append(f"Router inclus mais fichier manquant: {router_file}")

api_routes = extract_app_routes(main_text)

for router_file in sorted(ROUTERS_DIR.glob("*.py")):
    if router_file.name == "__init__.py":
        continue
    api_routes |= extract_routes_from_file(router_file)

missing_endpoints = sorted(REQUIRED_ENDPOINTS - api_routes)
if missing_endpoints:
    formatted = ", ".join(f"{method} {path}" for method, path in missing_endpoints)
    errors.append(f"Endpoints critiques absents: {formatted}")

if not SMOKE.exists():
    errors.append(f"Smoke test manquant: {SMOKE}")
else:
    smoke_text = SMOKE.read_text(encoding="utf-8")
    missing_smoke_paths = sorted(path for path in REQUIRED_SMOKE_PATHS if path not in smoke_text)
    if missing_smoke_paths:
        errors.append(f"Smoke backend ne couvre pas: {', '.join(missing_smoke_paths)}")

if errors:
    fail(errors)

print("api-surface-check-ok")
print(f"routers_included={len(included_routers)}")
print(f"ws_routers_included={len(included_ws_routers)}")
print(f"routes_detected={len(api_routes)}")

print("\nDetected critical endpoints:")
for method, path in sorted(REQUIRED_ENDPOINTS):
    print(f"- {method} {path}")
PY
