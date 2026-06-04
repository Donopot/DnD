#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

python3 - <<'PY'
from pathlib import Path
import sys

errors = []

styles_path = Path("frontend/src/styles/shell-gm.css")
notes_path = Path("frontend/src/components/GmNotesPanel.tsx")
party_path = Path("frontend/src/components/PartySummaryPanel.tsx")
initiative_path = Path("frontend/src/components/InitiativePanel.tsx")
visibility_path = Path("frontend/src/components/VisibilityInspectorPanel.tsx")
quick_actions_path = Path("frontend/src/components/QuickActions.tsx")

for path in [styles_path, notes_path, party_path, initiative_path, visibility_path, quick_actions_path]:
    if not path.exists():
        errors.append(f"Fichier manquant: {path}")

if errors:
    for error in errors:
        print("-", error)
    sys.exit(1)

styles = styles_path.read_text()
notes = notes_path.read_text()
party = party_path.read_text()
initiative = initiative_path.read_text()
visibility = visibility_path.read_text()
quick_actions = quick_actions_path.read_text()

required_css = [
    ".gm-panel-content",
    ".gm-panel-section",
    ".gm-panel-context",
    ".gm-panel-stat",
    ".gm-panel-card",
    ".gm-panel-row",
    ".gm-panel-list",
    ".gm-panel-actions",
    ".gm-panel-button",
    ".gm-panel-muted",
    ".gm-panel-badge",
    ".gm-panel-progress",
]

for selector in required_css:
    if selector not in styles:
        errors.append(f"CSS commun manquant: {selector}")

for component_name, content in [("GmNotesPanel", notes), ("PartySummaryPanel", party)]:
    if "gm-panel-content" not in content:
        errors.append(f"{component_name} n'utilise pas gm-panel-content")

    if "gm-panel-section" not in content and component_name != "PartySummaryPanel":
        errors.append(f"{component_name} n'utilise pas gm-panel-section")

if "gm-panel-context" not in notes:
    errors.append("GmNotesPanel n'utilise pas gm-panel-context")

if "gm-panel-list" not in party:
    errors.append("PartySummaryPanel n'utilise pas gm-panel-list")

if "gm-panel-progress" not in party:
    errors.append("PartySummaryPanel n'utilise pas gm-panel-progress")

# GM-2E Initiative — must use gm-panel-content + gm-panel-list
for component_name, content in [("InitiativePanel", initiative)]:
    if "gm-panel-content" not in content:
        errors.append(f"{component_name} n'utilise pas gm-panel-content")
    if "gm-panel-list" not in content:
        errors.append(f"{component_name} n'utilise pas gm-panel-list")
    if "gm-panel-footer" not in content:
        errors.append(f"{component_name} n'utilise pas gm-panel-footer")
    if "gm-panel-row" not in content:
        errors.append(f"{component_name} n'utilise pas gm-panel-row")

# GM-2F QuickActions — must use gm-panel-content
for component_name, content in [("QuickActions", quick_actions)]:
    if "gm-panel-content" not in content:
        errors.append(f"{component_name} n'utilise pas gm-panel-content")

# GM-2G VisibilityInspector — must use gm-panel-content + gm-panel-section
for component_name, content in [("VisibilityInspectorPanel", visibility)]:
    if "gm-panel-content" not in content:
        errors.append(f"{component_name} n'utilise pas gm-panel-content")
    if "gm-panel-section" not in content:
        errors.append(f"{component_name} n'utilise pas gm-panel-section")
    if "gm-panel-context" not in content:
        errors.append(f"{component_name} n'utilise pas gm-panel-context")

if errors:
    print("gm-panel-css-check-failed")
    for error in errors:
        print("-", error)
    sys.exit(1)

print("gm-panel-css-check-ok")
PY
