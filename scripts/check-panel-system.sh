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
config_path = Path("frontend/src/config/vttPanels.ts")

for path in [board_path, hook_path, menu_path, config_path]:
    if not path.exists():
        errors.append(f"Fichier manquant: {path}")

if errors:
    for error in errors:
        print("-", error)
    sys.exit(1)

board = board_path.read_text()
hook = hook_path.read_text()
menu = menu_path.read_text()
config = config_path.read_text()

if "reset-panels-button" in board:
    errors.append("VttBoard contient encore reset-panels-button. Le reset panneaux doit être uniquement dans VttPanelsMenu.")

if "data-quick-panel=" in board:
    errors.append("VttBoard contient encore data-quick-panel. Utiliser data-vtt-panel.")

for match in re.finditer(r'<(?:div|section|details)\b[^>]*data-vtt-panel="([^"]+)"[^>]*>', board):
    tag = match.group(0)
    panel_id = match.group(1)

    if f'data-floating-widget="{panel_id}"' not in tag:
        errors.append(f"Panneau {panel_id} sans data-floating-widget identique.")

    if "data-floating-title=" not in tag:
        errors.append(f"Panneau {panel_id} sans data-floating-title.")

panel_ids = re.findall(r'data-vtt-panel="([^"]+)"', board)
duplicates = sorted({panel_id for panel_id in panel_ids if panel_ids.count(panel_id) > 1})

if duplicates:
    errors.append("Panneaux dupliqués dans VttBoard: " + ", ".join(duplicates))

if 'from "../config/vttPanels"' not in menu:
    errors.append("VttPanelsMenu doit lire le registre ../config/vttPanels.")

if "const panels" in menu:
    errors.append("VttPanelsMenu ne doit plus définir une liste panels locale.")

if "disabled={!enabled}" in menu:
    # Autorisé pour sauvegarder / reset, interdit pour afficher un panneau.
    show_panel_area = re.search(r'<strong>Panneaux</strong>(.*?)</section>', menu, re.S)
    if show_panel_area and "disabled={!enabled}" in show_panel_area.group(1):
      errors.append("Les boutons d'affichage panneau ne doivent pas être disabled quand enabled=false.")

if "onSaveCustomPreset" not in menu:
    errors.append("VttPanelsMenu doit proposer la sauvegarde du layout personnalisé.")

if "querySelectorAll<HTMLElement>(\"[data-vtt-panel]\")" not in hook:
    errors.append("useFloatingWidgets doit détecter les panneaux via data-vtt-panel.")

if "rootElement = root" not in hook:
    errors.append("useFloatingWidgets doit capturer rootElement après le guard null.")

if "floating-widget-dock" not in hook:
    errors.append("useFloatingWidgets doit gérer un dock.")

if "pinned" not in hook:
    errors.append("useFloatingWidgets doit gérer l'état pinned.")

if "saveFloatingWidgetCustomPreset" not in hook:
    errors.append("useFloatingWidgets doit gérer le preset personnalisé.")

registry_match = re.search(r"export const VTT_PANELS:.*?\[(.*?)\];", config, re.S)
if not registry_match:
    errors.append("Impossible de lire VTT_PANELS.")
else:
    registry_ids = set(re.findall(r'id: "([^"]+)"', registry_match.group(1)))
    board_ids = set(panel_ids)

    missing = sorted(registry_ids - board_ids)
    extra = sorted(board_ids - registry_ids)

    if missing:
        errors.append("Panneaux du registre absents de VttBoard: " + ", ".join(missing))

    if extra:
        errors.append("Panneaux de VttBoard absents du registre: " + ", ".join(extra))

if errors:
    print("panel-system-check-failed")
    for error in errors:
        print("-", error)
    sys.exit(1)

print("panel-system-check-ok")
PY
