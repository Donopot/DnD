#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

python3 - <<'PY'
from pathlib import Path
import re
import sys

errors = []

files = {
    "board": Path("frontend/src/components/VttBoard.tsx"),
    "hook": Path("frontend/src/hooks/useFloatingWidgets.ts"),
    "menu": Path("frontend/src/components/VttPanelsMenu.tsx"),
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

board = files["board"].read_text()
hook = files["hook"].read_text()
menu = files["menu"].read_text()
config = files["config"].read_text()
styles = files["styles"].read_text()

# 1. Registre commun.
if 'export const VTT_PANELS' not in config:
    errors.append("VTT_PANELS absent du registre.")

if 'export const VTT_PANEL_PRESETS' not in config:
    errors.append("VTT_PANEL_PRESETS absent du registre.")

registry_match = re.search(r"export const VTT_PANELS:.*?\[(.*?)\];", config, re.S)
registry_ids = set(re.findall(r'id: "([^"]+)"', registry_match.group(1))) if registry_match else set()
board_ids = re.findall(r'data-vtt-panel="([^"]+)"', board)
board_id_set = set(board_ids)

missing = sorted(registry_ids - board_id_set)
extra = sorted(board_id_set - registry_ids)
duplicates = sorted({panel_id for panel_id in board_ids if board_ids.count(panel_id) > 1})

if missing:
    errors.append("Panneaux du registre absents de VttBoard: " + ", ".join(missing))

if extra:
    errors.append("Panneaux de VttBoard absents du registre: " + ", ".join(extra))

if duplicates:
    errors.append("Panneaux dupliqués dans VttBoard: " + ", ".join(duplicates))

# 2. Attributs standard.
if 'data-quick-panel="' in board:
    errors.append("data-quick-panel encore présent. Tous les panneaux doivent utiliser data-vtt-panel.")

for match in re.finditer(r'<(?:div|section|details)\b[^>]*data-vtt-panel="([^"]+)"[^>]*>', board):
    tag = match.group(0)
    panel_id = match.group(1)

    if f'data-floating-widget="{panel_id}"' not in tag:
        errors.append(f"{panel_id}: data-floating-widget manquant ou différent.")

    if 'data-floating-title="' not in tag:
        errors.append(f"{panel_id}: data-floating-title manquant.")

# 3. Menu.
if 'from "../config/vttPanels"' not in menu:
    errors.append("VttPanelsMenu doit utiliser le registre config/vttPanels.")

if "const panels" in menu or "const presets" in menu:
    errors.append("VttPanelsMenu ne doit pas avoir de liste locale panels/presets.")

panel_section = re.search(r'<strong>Panneaux</strong>(.*?)</section>', menu, re.S)
if panel_section and "disabled={!enabled}" in panel_section.group(1):
    errors.append("Les boutons d'affichage panneau ne doivent jamais être disabled par enabled.")

if "onSaveCustomPreset" not in menu:
    errors.append("Sauvegarde layout personnalisé absente du menu.")

if "onResetPanels" not in menu:
    errors.append("Reset panneaux absent du menu.")

# 4. Reset panneaux unique.
if "reset-panels-button" in board:
    errors.append("VttBoard contient encore reset-panels-button. Reset panneaux doit être uniquement dans le menu Panneaux.")

if "Réinitialiser les panneaux" not in menu and "Reinitialiser les panneaux" not in menu:
    errors.append("Le menu doit contenir le reset panneaux explicite.")

# 5. Hook runtime.
required_hook_tokens = [
    'querySelectorAll<HTMLElement>("[data-vtt-panel]")',
    "floating-widget-dock",
    "handleDockClick",
    "showFloatingWidget",
    "applyFloatingWidgetPreset",
    "saveFloatingWidgetCustomPreset",
    "pinned",
    "floating-widget-pinned",
    "floating-widget-collapsed",
    "floating-widget-locked",
    "data-floating-runtime-state",
    "dnd:show-floating-widget",
    "dnd:apply-floating-widget-preset",
    "dnd:save-floating-widget-custom-preset",
]

for token in required_hook_tokens:
    if token not in hook:
        errors.append(f"Contrat hook manquant: {token}")

# 6. Boutons runtime standards.
standard_buttons = {
    "frontButton": "Mettre au premier plan",
    "pinButton": "Épingler",
    "lockButton": "Verrouiller",
    "collapseButton": "Réduire",
    "hideButton": "Fermer",
}

for button_name, label_part in standard_buttons.items():
    if button_name not in hook:
        errors.append(f"Bouton runtime manquant: {button_name}")

    if label_part not in hook:
        errors.append(f"Libellé runtime manquant pour {button_name}: {label_part}")

# 7. Nettoyage listeners.
listener_pairs = [
    ('toolbar.addEventListener("pointerdown", handleToolbarPointerDown)', 'toolbar.removeEventListener("pointerdown", handleToolbarPointerDown)'),
    ('resizeHandle.addEventListener("pointerdown", handleResizeStart)', 'resizeHandle.removeEventListener("pointerdown", handleResizeStart)'),
    ('widget.addEventListener("pointerdown", bringToFront)', 'widget.removeEventListener("pointerdown", bringToFront)'),
    ('frontButton.addEventListener("click", handleFrontClick)', 'frontButton.removeEventListener("click", handleFrontClick)'),
    ('pinButton.addEventListener("click", handlePinClick)', 'pinButton.removeEventListener("click", handlePinClick)'),
    ('lockButton.addEventListener("click", handleLockClick)', 'lockButton.removeEventListener("click", handleLockClick)'),
    ('collapseButton.addEventListener("click", handleCollapseClick)', 'collapseButton.removeEventListener("click", handleCollapseClick)'),
    ('hideButton.addEventListener("click", handleHideClick)', 'hideButton.removeEventListener("click", handleHideClick)'),
]

for add_token, remove_token in listener_pairs:
    if add_token not in hook:
        errors.append(f"Listener add manquant: {add_token}")
    if remove_token not in hook:
        errors.append(f"Listener cleanup manquant: {remove_token}")

# 8. CSS minimum.
required_css = [
    ".floating-widget-dock",
    ".floating-widget-pinned",
    ".floating-widget-collapsed",
    ".floating-widget-toolbar",
    ".vtt-panels-menu",
]

for token in required_css:
    if token not in styles:
        errors.append(f"CSS panneau manquant: {token}")

if ".floating-widget-drag-handle" in hook:
    errors.append("Ancien système floating-widget-drag-handle encore présent dans le hook.")

if errors:
    print("panel-interactions-check-failed")
    for error in errors:
        print("-", error)
    sys.exit(1)

print("panel-interactions-check-ok")
print("Panels checked:", ", ".join(sorted(registry_ids)))
PY
