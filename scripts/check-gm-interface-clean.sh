#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

python3 - <<'PY'
from pathlib import Path
import re
import sys

errors = []

app_path = Path("frontend/src/App.tsx")
tabs_path = Path("frontend/src/components/CampaignViewTabs.tsx")
vtt_path = Path("frontend/src/components/VttBoard.tsx")

for path in [app_path, tabs_path, vtt_path]:
    if not path.exists():
        errors.append(f"Fichier manquant: {path}")

if errors:
    for error in errors:
        print("-", error)
    sys.exit(1)

app = app_path.read_text()
tabs = tabs_path.read_text()
vtt = vtt_path.read_text()

old_tabs = ["overview", "session", "table", "combat"]
for old_tab in old_tabs:
    if f'"{old_tab}"' in tabs:
        errors.append(f"Ancien onglet encore présent dans CampaignViewTabs: {old_tab}")

required_tabs = ["campaign", "preparation", "live", "characters", "journal", "library", "settings"]
for tab in required_tabs:
    if f'"{tab}"' not in tabs:
        errors.append(f"Onglet cible absent: {tab}")

if "Table virtuelle" in vtt:
    errors.append('Le texte "Table virtuelle" est encore présent dans VttBoard.')

if "<CombatPanel" in app:
    errors.append("CombatPanel est encore rendu directement dans App.tsx. Combat doit être un mode/panneau de Session Live.")

session_log_match = re.search(r'activeCampaignView === "journal"[\s\S]{0,300}<SessionLogPanel', app)
if not session_log_match:
    errors.append("SessionLogPanel doit être rendu uniquement sous activeCampaignView === \"journal\".")

vtt_match = re.search(r'activeCampaignView === "live" \|\| activeCampaignView === "preparation"[\s\S]{0,500}<VttBoard', app)
if not vtt_match:
    errors.append("VttBoard doit être rendu uniquement pour live ou preparation.")

if "campaign-view-${activeCampaignView}" not in app:
    errors.append("detail-panel doit recevoir la classe campaign-view-${activeCampaignView}.")

if "<CampaignViewTabs" not in app:
    errors.append("CampaignViewTabs n'est pas rendu dans App.tsx.")

if errors:
    print("gm-interface-clean-check-failed")
    for error in errors:
        print("-", error)
    sys.exit(1)

print("gm-interface-clean-check-ok")
PY
