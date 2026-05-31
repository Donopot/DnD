#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

python3 - <<'PY'
from pathlib import Path
import re
import sys

errors = []

board_path = Path("frontend/src/components/VttBoard.tsx")
styles_path = Path("frontend/src/styles.css")
config_path = Path("frontend/src/config/vttPanels.ts")

required_components = [
    Path("frontend/src/components/TokenDetailPanel.tsx"),
    Path("frontend/src/components/GmNotesPanel.tsx"),
    Path("frontend/src/components/PartySummaryPanel.tsx"),
]

for path in [board_path, styles_path, config_path, *required_components]:
    if not path.exists():
        errors.append(f"Fichier manquant: {path}")

if errors:
    print("gm-panels-standard-layout-check-failed")
    for error in errors:
        print("-", error)
    sys.exit(1)

board = board_path.read_text()
styles = styles_path.read_text()
config = config_path.read_text()

components = {
    "TokenDetailPanel": Path("frontend/src/components/TokenDetailPanel.tsx").read_text(),
    "GmNotesPanel": Path("frontend/src/components/GmNotesPanel.tsx").read_text(),
    "PartySummaryPanel": Path("frontend/src/components/PartySummaryPanel.tsx").read_text(),
}

if 'data-quick-panel="' in board:
    errors.append("VttBoard contient encore data-quick-panel.")

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

for match in re.finditer(r'<(?:div|section|details)\b[^>]*data-vtt-panel="([^"]+)"[^>]*>', board):
    tag = match.group(0)
    panel_id = match.group(1)

    if f'data-floating-widget="{panel_id}"' not in tag:
        errors.append(f"{panel_id}: data-floating-widget manquant ou différent.")

    if "data-floating-title=" not in tag:
        errors.append(f"{panel_id}: data-floating-title manquant.")

    if 'className="' in tag and "tool-card" not in tag:
        errors.append(f"{panel_id}: className ne contient pas tool-card.")

if "token-detail-panel" in board:
    errors.append("Ancien layout token-detail-panel encore présent dans VttBoard.")

if "token-detail-grid" in board:
    errors.append("Ancien layout token-detail-grid encore présent dans VttBoard.")

if "token-detail-actions" in board:
    errors.append("Ancien layout token-detail-actions encore présent dans VttBoard.")

if "<TokenDetailPanel" not in board:
    errors.append("TokenDetailPanel n'est pas rendu dans VttBoard.")

for name, content in components.items():
    if "gm-panel-content" not in content:
        errors.append(f"{name} n'utilise pas gm-panel-content.")

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
    ".token-detail-nudge-grid",
]

for selector in required_css:
    if selector not in styles:
        errors.append(f"CSS attendu manquant: {selector}")

if errors:
    print("gm-panels-standard-layout-check-failed")
    for error in errors:
        print("-", error)
    sys.exit(1)

print("gm-panels-standard-layout-check-ok")
print("Panels:", ", ".join(sorted(board_id_set)))
PY
