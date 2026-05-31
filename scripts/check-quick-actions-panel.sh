#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

python3 - <<'PY'
from pathlib import Path
import re
import sys

errors = []

quick_path = Path("frontend/src/components/QuickActionsPanel.tsx")
board_path = Path("frontend/src/components/VttBoard.tsx")
config_path = Path("frontend/src/config/vttPanels.ts")
hook_path = Path("frontend/src/hooks/useFloatingWidgets.ts")

for path in [quick_path, board_path, config_path, hook_path]:
    if not path.exists():
        errors.append(f"Fichier manquant: {path}")

if errors:
    for error in errors:
        print("-", error)
    sys.exit(1)

quick = quick_path.read_text()
board = board_path.read_text()
config = config_path.read_text()
hook = hook_path.read_text()

required_panels = [
    "token-detail",
    "visibility-inspector",
    "initiative",
    "party-summary",
    "gm-notes",
    "scene",
    "token",
    "tokens",
    "minimap",
]

for panel_id in required_panels:
    if f'id: "{panel_id}"' not in quick:
        errors.append(f"Actions rapides ne contient pas le bouton panneau: {panel_id}")

    if f'id: "{panel_id}"' not in config:
        errors.append(f"Le panneau {panel_id} est absent du registre vttPanels.ts")

    if f'data-vtt-panel="{panel_id}"' not in board:
        errors.append(f"Le panneau {panel_id} est absent de VttBoard")

required_presets = [
    "exploration",
    "combat",
    "roleplay",
    "quick-prep",
    "minimal",
]

for preset in required_presets:
    if f'id: "{preset}"' not in quick:
        errors.append(f"Actions rapides ne contient pas le bouton layout: {preset}")

required_rolls = [
    ('"d20"', "20"),
    ('"d12"', "12"),
    ('"d10"', "10"),
    ('"d8"', "8"),
    ('"d6"', "6"),
    ('"d4"', "4"),
]

for label, sides in required_rolls:
    if label not in quick or f"sides: {sides}" not in quick:
        errors.append(f"Dé rapide manquant ou incorrect: {label}")

required_functions = [
    "handleShowPanel",
    "handleApplyPreset",
    "handleRoll",
    "copySceneSummary",
    "rollDie",
]

for function_name in required_functions:
    if function_name not in quick:
        errors.append(f"Fonction manquante: {function_name}")

if "showFloatingWidget(panelId)" not in quick:
    errors.append("handleShowPanel ne déclenche pas showFloatingWidget(panelId)")

if "applyFloatingWidgetPreset(preset)" not in quick:
    errors.append("handleApplyPreset ne déclenche pas applyFloatingWidgetPreset(preset)")

if "navigator.clipboard" not in quick:
    errors.append("Copier résumé n'utilise pas navigator.clipboard")

if 'data-vtt-panel="quick-actions"' not in board:
    errors.append("VttBoard ne contient pas data-vtt-panel=\"quick-actions\"")

if "<QuickActionsPanel" not in board:
    errors.append("VttBoard ne rend pas QuickActionsPanel")

if "showFloatingWidget" not in hook:
    errors.append("useFloatingWidgets ne fournit pas showFloatingWidget")

if "applyFloatingWidgetPreset" not in hook:
    errors.append("useFloatingWidgets ne fournit pas applyFloatingWidgetPreset")

if errors:
    print("quick-actions-check-failed")
    for error in errors:
        print("-", error)
    sys.exit(1)

print("quick-actions-check-ok")
PY
