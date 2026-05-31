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
    "config": Path("frontend/src/config/vttPanels.ts"),
    "styles": Path("frontend/src/styles.css"),
}

for name, path in files.items():
    if not path.exists():
        errors.append(f"Fichier manquant: {path}")

if errors:
    for error in errors:
        print("-", error)
    sys.exit(1)

component = files["component"].read_text()
board = files["board"].read_text()
config = files["config"].read_text()
styles = files["styles"].read_text()

checks = [
    ('id: "gm-notes"', config, "gm-notes absent du registre"),
    ('data-vtt-panel="gm-notes"', board, "panneau gm-notes absent de VttBoard"),
    ('data-floating-widget="gm-notes"', board, "data-floating-widget gm-notes absent"),
    ('data-floating-title="Notes MJ"', board, "titre flottant Notes MJ absent"),
    ("<GmNotesPanel", board, "GmNotesPanel non rendu"),
    ("campaignId={campaignId}", board, "campaignId non transmis à GmNotesPanel"),
    ("selectedScene={selectedScene}", board, "selectedScene non transmise à GmNotesPanel"),
    ("selectedToken={selectedToken}", board, "selectedToken non transmis à GmNotesPanel"),
    ("window.localStorage", component, "sauvegarde localStorage absente"),
    ("navigator.clipboard", component, "copie clipboard absente"),
    (".gm-notes-panel", styles, "CSS gm-notes-panel absent"),
]

for needle, content, message in checks:
    if needle not in content:
        errors.append(message)

if errors:
    print("gm-notes-check-failed")
    for error in errors:
        print("-", error)
    sys.exit(1)

print("gm-notes-check-ok")
PY
