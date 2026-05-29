#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

python3 - <<'PY'
from pathlib import Path
import re
import sys

errors = []

board_path = Path("frontend/src/components/VttBoard.tsx")
hook_path = Path("frontend/src/hooks/useFloatingWidgets.ts")
menu_path = Path("frontend/src/components/VttPanelsMenu.tsx")

board = board_path.read_text()
hook = hook_path.read_text()
menu = menu_path.read_text()

if "data-quick-panel=" in board:
    errors.append("VttBoard contient encore data-quick-panel. Utiliser data-vtt-panel.")

for match in re.finditer(r'<(?:div|section|details)\b[^>]*data-vtt-panel="([^"]+)"[^>]*>', board):
    tag = match.group(0)
    panel_id = match.group(1)

    if f'data-floating-widget="{panel_id}"' not in tag:
        errors.append(f"Panneau {panel_id} sans data-floating-widget coherent.")

    if "data-floating-title=" not in tag:
        errors.append(f"Panneau {panel_id} sans data-floating-title.")

panel_ids = re.findall(r'data-vtt-panel="([^"]+)"', board)

duplicates = sorted({panel_id for panel_id in panel_ids if panel_ids.count(panel_id) > 1})

if duplicates:
    errors.append("Panneaux dupliques dans VttBoard: " + ", ".join(duplicates))

if "rootElement = root" not in hook:
    errors.append("useFloatingWidgets doit capturer rootElement apres le guard null.")

if "querySelectorAll<HTMLElement>(\"[data-vtt-panel]\")" not in hook:
    errors.append("useFloatingWidgets doit detecter les panneaux via data-vtt-panel.")

if "saveFloatingWidgetCustomPreset" not in hook:
    errors.append("Preset personnalise absent du hook.")

if "floating-widget-dock" not in hook:
    errors.append("Dock runtime absent du hook.")

if "onSaveCustomPreset" not in menu:
    errors.append("VttPanelsMenu ne propose pas la sauvegarde du layout personnalise.")

if "disabled={!enabled}" in menu and "onShowPanel" in menu:
    errors.append("Les boutons d'affichage panneau ne doivent pas etre bloques par enabled.")

if errors:
    print("panel-system-check-failed")
    for error in errors:
        print("-", error)
    sys.exit(1)

print("panel-system-check-ok")
PY
