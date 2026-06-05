#!/usr/bin/env bash
# check-gm-panels-current.sh
# Vérifie la cohérence entre le registre gmPanels.ts et l'implémentation.
# Post-PanelRenderer: vérifie panelRenderer.tsx + GmWorkspace.tsx + GmFloatingPanels.tsx.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ERRORS=0

REGISTRY="$ROOT/frontend/src/config/gmPanels.ts"
RENDERER="$ROOT/frontend/src/panels/panelRenderer.tsx"
WORKSPACE="$ROOT/frontend/src/app/GmWorkspace.tsx"
FLOATING="$ROOT/frontend/src/panels/GmFloatingPanels.tsx"

for f in "$REGISTRY" "$RENDERER" "$WORKSPACE" "$FLOATING"; do
  if [[ ! -f "$f" ]]; then
    echo "❌ Fichier manquant : $f"
    exit 1
  fi
done

echo "🔍 Vérification des panneaux GM..."
echo ""
echo "   Architecture: PanelRenderer + GmWorkspace + GmFloatingPanels"
echo ""

# Extraire les IDs depuis le tableau GM_PANELS
REGISTRY_IDS=$(sed -n '/^export const GM_PANELS/,/^];$/p' "$REGISTRY" | grep -oP 'id:\s*"\K[^"]+' | sort -u)

# panelRenderer.tsx → switch/case panelId
RENDERER_IDS=$(grep -oP 'case\s+"\K[^"]+' "$RENDERER" 2>/dev/null | sort -u || true)

# GmWorkspace.tsx → fp.open(id) 
FP_OPEN_IDS=$(grep -oP 'fp\.open\(\"\K[^\"]+' "$WORKSPACE" 2>/dev/null | sort -u || true)

# GmFloatingPanels.tsx → floating panel IDs
FLOAT_IDS=$(grep -oP 'case\s+"\K[^"]+' "$FLOATING" 2>/dev/null | sort -u || true)

ALL_IDS=$( { echo "$RENDERER_IDS"; echo "$FP_OPEN_IDS"; echo "$FLOAT_IDS"; } | sort -u)

echo "   Registre      : $(echo "$REGISTRY_IDS" | wc -l) IDs"
echo "   PanelRenderer : $(echo "$RENDERER_IDS" | wc -l) panels"
echo "   GmWorkspace   : $(echo "$FP_OPEN_IDS" | wc -l) fp.open()"
echo "   Floating      : $(echo "$FLOAT_IDS" | wc -l) floating panels"
echo ""

# Vérifier que chaque panel actif du registre est rendu quelque part
active_ids=$(python3 -c "
import re
with open('$REGISTRY') as f:
    text = f.read()
m = re.search(r'export const GM_PANELS.*?= \[(.*?)\];', text, re.DOTALL)
if not m:
    exit(1)
block = m.group(1)
entries = re.findall(r'id:\s*\"(\S+?)\".*?status:\s*\"(\S+?)\"', block, re.DOTALL)
for id_, status in entries:
    print(f'{id_} {status}')
" 2>/dev/null)

echo "─── Panneaux actifs non rendus ───"
while IFS=' ' read -r id status; do
  [[ -z "$id" ]] && continue
  [[ "$status" != "active" ]] && continue
  if ! echo "$ALL_IDS" | grep -qFx "$id"; then
    echo "   ❌ $id — actif dans le registre, jamais rendu"
    ERRORS=$((ERRORS + 1))
  fi
done <<< "$active_ids"

# Vérifier qu'aucun panel rendu n'est absent du registre
echo ""
echo "─── Panneaux rendus absents du registre ───"
while IFS= read -r id; do
  [[ -z "$id" ]] && continue
  if ! echo "$REGISTRY_IDS" | grep -qFx "$id"; then
    echo "   ⚠️  $id — rendu dans le code, absent du registre"
    ERRORS=$((ERRORS + 1))
  fi
done <<< "$ALL_IDS"

echo ""
if [ "$ERRORS" -eq 0 ]; then
  echo "✅ Tous les panneaux actifs sont correctement enregistrés et rendus."
  echo "gm-panels-check-ok"
  exit 0
else
  echo "❌ $ERRORS incohérence(s) panneau détectée(s)"
  exit 1
fi
