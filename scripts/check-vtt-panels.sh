#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

python3 - <<'PY'
from pathlib import Path
import re
import sys

config_path = Path("frontend/src/config/vttPanels.ts")
board_path = Path("frontend/src/components/VttBoard.tsx")

if not config_path.exists():
    print("Manque frontend/src/config/vttPanels.ts")
    sys.exit(1)

if not board_path.exists():
    print("Manque frontend/src/components/VttBoard.tsx")
    sys.exit(1)

config = config_path.read_text()
board = board_path.read_text()

registry_match = re.search(r"export const VTT_PANELS:.*?\[(.*?)\];", config, re.S)

if not registry_match:
    print("Impossible de lire VTT_PANELS")
    sys.exit(1)

registry_ids = set(re.findall(r'id: "([^"]+)"', registry_match.group(1)))
board_ids = set(re.findall(r'data-vtt-panel="([^"]+)"', board))

missing = sorted(registry_ids - board_ids)
extra = sorted(board_ids - registry_ids)

print("Registry panels:", ", ".join(sorted(registry_ids)))
print("Board panels:   ", ", ".join(sorted(board_ids)))

if missing:
    print("Panneaux du registre absents de VttBoard:", ", ".join(missing))

if extra:
    print("Panneaux de VttBoard absents du registre:", ", ".join(extra))

if missing or extra:
    sys.exit(1)

print("vtt-panel-registry-ok")
PY
