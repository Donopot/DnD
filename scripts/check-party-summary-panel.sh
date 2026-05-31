#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

python3 - <<'PY'
from pathlib import Path
import sys

errors = []

files = {
    "component": Path("frontend/src/components/PartySummaryPanel.tsx"),
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
    ('id: "party-summary"', config, "party-summary absent du registre"),
    ('data-vtt-panel="party-summary"', board, "panneau party-summary absent de VttBoard"),
    ('data-floating-widget="party-summary"', board, "data-floating-widget party-summary absent"),
    ('data-floating-title="Résumé du groupe"', board, "titre flottant Résumé du groupe absent"),
    ("<PartySummaryPanel", board, "PartySummaryPanel non rendu"),
    ("characters={characters}", board, "characters non transmis à PartySummaryPanel"),
    ("selectedCharacter={selectedCharacter}", board, "selectedCharacter non transmis à PartySummaryPanel"),
    ("getPassivePerception", component, "perception passive absente"),
    ("getHpPercent", component, "calcul pourcentage PV absent"),
    (".party-summary-panel", styles, "CSS party-summary-panel absent"),
]

for needle, content, message in checks:
    if needle not in content:
        errors.append(message)

if errors:
    print("party-summary-check-failed")
    for error in errors:
        print("-", error)
    sys.exit(1)

print("party-summary-check-ok")
PY
