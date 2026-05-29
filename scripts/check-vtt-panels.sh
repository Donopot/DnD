#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

python3 - <<'PY'
from pathlib import Path
import re
import sys

config = Path("frontend/src/config/vttPanels.ts").read_text()
board = Path("frontend/src/components/VttBoard.tsx").read_text()

panels_match = re.search(r"export const VTT_PANELS:.*?\[(.*?)\];", config, re.S)

if not panels_match:
    print("Impossible de lire VTT_PANELS dans frontend/src/config/vttPanels.ts")
    sys.exit(1)

registry_ids = set(re.findall(r'id: "([^"]+)"', panels_match.group(1)))
board_ids = set(re.findall(r'data-vtt-panel="([^"]+)"', board))

missing = sorted(registry_ids - board_ids)
extra = sorted(board_ids - registry_ids)

print("Registry panels:", ", ".join(sorted(registry_ids)))
print("Board panels:   ", ", ".join(sorted(board_ids)))

if missing:
    print("Panneaux présents dans le registre mais absents de VttBoard:", ", ".join(missing))

if extra:
    print("Panneaux présents dans VttBoard mais absents du registre:", ", ".join(extra))

if missing or extra:
    sys.exit(1)

print("vtt-panel-registry-ok")
PY
