#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

python3 - <<'PY'
from pathlib import Path
import sys

errors = []

files = {
    "component": Path("frontend/src/components/GmNotesPanel.tsx"),
    "board": Path("frontend/src/components/VttBoard.tsx"),
    "session": Path("frontend/src/components/SessionWorkspace.tsx"),
    "app": Path("frontend/src/App.tsx"),
    "types": Path("frontend/src/api/types.ts"),
}

for name, path in files.items():
    if not path.exists():
        errors.append(f"Fichier manquant: {path}")

if errors:
    print("gm-notes-api-check-failed")
    for error in errors:
        print("-", error)
    sys.exit(1)

component = files["component"].read_text()
board = files["board"].read_text()
session = files["session"].read_text()
app = files["app"].read_text()
types = files["types"].read_text()

checks = [
    ("export type GMNote", types, "Type GMNote absent"),
    ("authToken: string", component, "GmNotesPanel ne reçoit pas authToken"),
    ('/api/campaigns/${campaignId}/gm-notes', component, "Endpoint list/create gm-notes absent"),
    ('/api/gm-notes/${noteId}', component, "Endpoint patch gm-note absent"),
    ("Authorization: `Bearer ${authToken}`", component, "Authorization Bearer absent dans GmNotesPanel"),
    ("localStorage", component, "Fallback localStorage absent"),
    ("Synchronisé serveur", component, "Statut synchronisé absent"),
    ("Local uniquement", component, "Statut local absent"),
    ("authToken={authToken}", board, "VttBoard ne transmet pas authToken à GmNotesPanel"),
    ("authToken: string", board, "VttBoardProps ne contient pas authToken"),
    ("authToken={authToken}", session, "SessionWorkspace ne transmet pas authToken à VttBoard"),
    ("authToken: string", session, "SessionWorkspaceProps ne contient pas authToken"),
    ("authToken={token}", app, "App ne transmet pas token en authToken"),
]

for needle, content, message in checks:
    if needle not in content:
        errors.append(message)

if errors:
    print("gm-notes-api-check-failed")
    for error in errors:
        print("-", error)
    sys.exit(1)

print("gm-notes-api-check-ok")
PY
