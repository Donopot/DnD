#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

python3 - <<'PY'
from pathlib import Path
import re
import sys
from collections import Counter

errors = []
warnings = []

paths = {
    "board": Path("frontend/src/components/VttBoard.tsx"),
    "config": Path("frontend/src/config/vttPanels.ts"),
    "menu": Path("frontend/src/components/VttPanelsMenu.tsx"),
    "quick": Path("frontend/src/components/QuickActionsPanel.tsx"),
    "styles": Path("frontend/src/styles.css"),
}

for name, path in paths.items():
    if name != "quick" and not path.exists():
        errors.append(f"Fichier manquant: {path}")

if errors:
    print("audit-gm-panels-complete-failed")
    for error in errors:
        print("-", error)
    sys.exit(1)

board = paths["board"].read_text()
config = paths["config"].read_text()
menu = paths["menu"].read_text()
quick = paths["quick"].read_text() if paths["quick"].exists() else ""
styles = paths["styles"].read_text()

# Panneaux flottants standardisés attendus.
expected_floating_panels = {
    "minimap": "Mini-map",
    "token-detail": "Détail token",
    "visibility-inspector": "Visibilité",
    "quick-actions": "Actions rapides",
    "party-summary": "Résumé du groupe",
    "gm-notes": "Notes MJ",
    "tokens": "Liste tokens",
    "initiative": "Initiative",
    "scene": "Scènes",
    "upload-map": "Upload carte",
    "background": "Fond de carte",
    "token": "Ajout token",
}

# Éléments UI liés aux panneaux mais pas forcément flottants.
expected_panel_ui = {
    "panels-menu": "Gestion panneaux / Panneaux",
    "keyboard-help": "Raccourcis",
}

# Tout ce que VttBoard rend comme panneau, même ancien format.
board_vtt_ids = re.findall(r'data-vtt-panel="([^"]+)"', board)
board_floating_ids = re.findall(r'data-floating-widget="([^"]+)"', board)
board_legacy_ids = re.findall(r'data-quick-panel="([^"]+)"', board)

board_vtt_set = set(board_vtt_ids)
board_floating_set = set(board_floating_ids)
board_legacy_set = set(board_legacy_ids)
board_all_set = board_vtt_set | board_floating_set | board_legacy_set

# Registre.
registry_block_match = re.search(r"export const VTT_PANELS:.*?\[(.*?)\];", config, re.S)
if not registry_block_match:
    errors.append("Impossible de lire export const VTT_PANELS dans vttPanels.ts")
    registry_ids = []
    registry_labels = {}
else:
    registry_block = registry_block_match.group(1)
    registry_ids = re.findall(r'id: "([^"]+)"', registry_block)
    registry_labels = dict(re.findall(r'id: "([^"]+)",\s*label: "([^"]+)"', registry_block, re.S))

registry_set = set(registry_ids)

# QuickActionsPanel : panneaux appelés par bouton.
quick_panel_ids = set()
quick_preset_ids = set()

if quick:
    quick_panels_match = re.search(r"quickPanels.*?\[(.*?)\];", quick, re.S)
    if quick_panels_match:
        quick_panel_ids = set(re.findall(r'id: "([^"]+)"', quick_panels_match.group(1)))

    quick_presets_match = re.search(r"quickPresets.*?\[(.*?)\];", quick, re.S)
    if quick_presets_match:
        quick_preset_ids = set(re.findall(r'id: "([^"]+)"', quick_presets_match.group(1)))

# Appels directs dans VttBoard.
direct_refs = set(re.findall(r'(?:showFloatingWidget|openGmPanel)\("([^"]+)"', board))

# 1. Doublons registre.
registry_counts = Counter(registry_ids)
registry_duplicates = sorted([panel_id for panel_id, count in registry_counts.items() if count > 1])

if registry_duplicates:
    errors.append("Doublons dans VTT_PANELS: " + ", ".join(registry_duplicates))

# 2. Doublons rendu.
board_counts = Counter(board_vtt_ids)
board_duplicates = sorted([panel_id for panel_id, count in board_counts.items() if count > 1])

if board_duplicates:
    errors.append("Doublons data-vtt-panel dans VttBoard: " + ", ".join(board_duplicates))

# 3. Liste attendue complète.
expected_ids = set(expected_floating_panels)

missing_from_registry = sorted(expected_ids - registry_set)
missing_from_board_standard = sorted(expected_ids - board_vtt_set)

if missing_from_registry:
    errors.append("Panneaux attendus absents du registre: " + ", ".join(missing_from_registry))

if missing_from_board_standard:
    errors.append("Panneaux attendus absents de VttBoard en data-vtt-panel: " + ", ".join(missing_from_board_standard))

# 4. Anciens formats.
if board_legacy_set:
    errors.append("Anciens data-quick-panel encore présents: " + ", ".join(sorted(board_legacy_set)))

legacy_only = sorted((board_floating_set | board_legacy_set) - board_vtt_set)
if legacy_only:
    errors.append("Panneaux détectés mais pas standardisés en data-vtt-panel: " + ", ".join(legacy_only))

# 5. Attributs obligatoires.
for panel_id in sorted(board_vtt_set):
    tag_match = re.search(
        rf'<(?:div|section|details)\b[^>]*data-vtt-panel="{re.escape(panel_id)}"[^>]*>',
        board,
        re.S,
    )

    if not tag_match:
        errors.append(f"{panel_id}: tag data-vtt-panel introuvable")
        continue

    tag = tag_match.group(0)

    if f'data-floating-widget="{panel_id}"' not in tag:
        errors.append(f"{panel_id}: data-floating-widget manquant ou différent")

    if 'data-floating-title="' not in tag:
        errors.append(f"{panel_id}: data-floating-title manquant")

    if "tool-card" not in tag:
        errors.append(f"{panel_id}: className ne contient pas tool-card")

# 6. Labels officiels.
for panel_id, expected_label in expected_floating_panels.items():
    actual = registry_labels.get(panel_id)

    if actual and actual != expected_label:
        errors.append(f'{panel_id}: label registre "{actual}" différent de "{expected_label}"')

# 7. QuickActionsPanel.
quick_missing_registry = sorted(quick_panel_ids - registry_set)
quick_missing_board = sorted(quick_panel_ids - board_vtt_set)

if quick_missing_registry:
    errors.append("Actions rapides appelle des panneaux absents du registre: " + ", ".join(quick_missing_registry))

if quick_missing_board:
    errors.append("Actions rapides appelle des panneaux absents de VttBoard: " + ", ".join(quick_missing_board))

# 8. Appels directs.
direct_missing_registry = sorted(direct_refs - registry_set)
direct_missing_board = sorted(direct_refs - board_vtt_set)

if direct_missing_registry:
    errors.append("open/show direct appelle des panneaux absents du registre: " + ", ".join(direct_missing_registry))

if direct_missing_board:
    errors.append("open/show direct appelle des panneaux absents de VttBoard: " + ", ".join(direct_missing_board))

# 9. UI non flottante mais attendue.
if "<VttPanelsMenu" not in board:
    errors.append("VttBoard ne rend pas VttPanelsMenu / Gestion panneaux")

if "keyboard-help" not in board:
    warnings.append("Raccourcis / keyboard-help non trouvé dans VttBoard")

# 10. CSS commun.
required_css = [
    ".gm-panel-content",
    ".gm-panel-section",
    ".gm-panel-context",
    ".gm-panel-stat",
    ".gm-panel-card",
    ".gm-panel-row",
    ".gm-panel-list",
    ".gm-panel-actions",
    ".gm-panel-muted",
    ".gm-panel-badge",
    ".gm-panel-progress",
    ".floating-widget-dock",
    ".floating-widget-toolbar",
]

for selector in required_css:
    if selector not in styles:
        errors.append(f"CSS commun manquant: {selector}")

print("===== PANNEAUX FLOTTANTS ATTENDUS =====")
for panel_id, label in expected_floating_panels.items():
    print(f"{panel_id:22} -> {label}")

print()
print("===== UI PANNEAUX NON FLOTTANTE À SURVEILLER =====")
for panel_id, label in expected_panel_ui.items():
    print(f"{panel_id:22} -> {label}")

print()
print("===== TROUVÉS DANS VttBoard =====")
print("data-vtt-panel:")
for panel_id in sorted(board_vtt_set):
    print(f"- {panel_id}")

print()
print("data-floating-widget:")
for panel_id in sorted(board_floating_set):
    print(f"- {panel_id}")

print()
print("data-quick-panel:")
if board_legacy_set:
    for panel_id in sorted(board_legacy_set):
        print(f"- {panel_id}")
else:
    print("- aucun")

print()
print("===== REGISTRE VTT_PANELS =====")
for panel_id in sorted(registry_set):
    print(f"- {panel_id}: {registry_labels.get(panel_id, '?')}")

print()
print("===== ACTIONS RAPIDES : PANNEAUX =====")
if quick_panel_ids:
    for panel_id in sorted(quick_panel_ids):
        print(f"- {panel_id}")
else:
    print("- aucun détecté ou fichier absent")

print()
print("===== ACTIONS RAPIDES : LAYOUTS =====")
if quick_preset_ids:
    for preset_id in sorted(quick_preset_ids):
        print(f"- {preset_id}")
else:
    print("- aucun détecté ou fichier absent")

print()
print("===== APPELS DIRECTS open/show =====")
if direct_refs:
    for panel_id in sorted(direct_refs):
        print(f"- {panel_id}")
else:
    print("- aucun")

if warnings:
    print()
    print("WARNINGS")
    for warning in warnings:
        print("-", warning)

if errors:
    print()
    print("audit-gm-panels-complete-failed")
    for error in errors:
        print("-", error)
    sys.exit(1)

print()
print("audit-gm-panels-complete-ok")
PY
