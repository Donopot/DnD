#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

python3 - <<'PY'
from pathlib import Path
import re
import sys

errors = []

board = Path("frontend/src/components/VttBoard.tsx").read_text()
hook = Path("frontend/src/hooks/useFloatingWidgets.ts").read_text()
menu = Path("frontend/src/components/VttPanelsMenu.tsx").read_text()

if "reset-panels-button" in board:
    errors.append("VttBoard contient encore reset-panels-button.")

if 'data-quick-panel="' in board:
    errors.append("VttBoard contient encore data-quick-panel.")

for match in re.finditer(r'<(?:div|section|details)\b[^>]*data-vtt-panel="([^"]+)"[^>]*>', board):
    tag = match.group(0)
    panel_id = match.group(1)

    if f'data-floating-widget="{panel_id}"' not in tag:
        errors.append(f"{panel_id}: data-floating-widget manquant ou différent.")

    if 'data-floating-title="' not in tag:
        errors.append(f"{panel_id}: data-floating-title manquant.")

panel_ids = re.findall(r'data-vtt-panel="([^"]+)"', board)
duplicates = sorted({panel_id for panel_id in panel_ids if panel_ids.count(panel_id) > 1})

if duplicates:
    errors.append("Panneaux dupliqués dans VttBoard: " + ", ".join(duplicates))

if 'from "../config/vttPanels"' not in menu:
    errors.append("VttPanelsMenu ne lit pas le registre vttPanels.")

if "const panels" in menu or "const presets" in menu:
    errors.append("VttPanelsMenu contient encore une liste locale.")

if "disabled={!enabled}" in re.search(r'<strong>Panneaux</strong>(.*?)</section>', menu, re.S).group(1):
    errors.append("Les boutons d'affichage panneaux sont encore disabled.")

required_hook_tokens = [
    'querySelectorAll<HTMLElement>("[data-vtt-panel]")',
    "floating-widget-dock",
    "showFloatingWidget",
    "applyFloatingWidgetPreset",
    "saveFloatingWidgetCustomPreset",
    "pinned",
    "floating-widget-pinned",
    "dnd:save-floating-widget-custom-preset",
]

for token in required_hook_tokens:
    if token not in hook:
        errors.append(f"Contrat hook manquant: {token}")

if errors:
    print("panel-system-check-failed")
    for error in errors:
        print("-", error)
    sys.exit(1)

print("panel-system-check-ok")
PY
