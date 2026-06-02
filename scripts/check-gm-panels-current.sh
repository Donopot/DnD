#!/usr/bin/env bash
# check-gm-panels-current.sh
# Vérifie la cohérence entre le registre gmPanels.ts et l'implémentation App.tsx.
# PANEL-1 — créé avec le registre unique gmPanels.ts.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ERRORS=0

REGISTRY="$ROOT/frontend/src/config/gmPanels.ts"
APP="$ROOT/frontend/src/App.tsx"

for f in "$REGISTRY" "$APP"; do
  if [[ ! -f "$f" ]]; then
    echo "❌ Fichier manquant : $f"
    exit 1
  fi
done

echo "🔍 Vérification des panneaux GM..."
echo ""

# ── Helpers ────────────────────────────────────────────────────────────

# Extrait les IDs depuis le tableau GM_PANELS uniquement
extract_registry_ids() {
  sed -n '/^export const GM_PANELS/,/^];$/p' "$REGISTRY" | grep -oP 'id:\s*"\K[^"]+' | sort -u
}

# Extrait les IDs legacy → standard depuis LEGACY_ID_MAP
extract_legacy_map() {
  sed -n '/^export const LEGACY_ID_MAP/,/^};$/p' "$REGISTRY" | grep -oP '(\w+):\s*"\K[^"]+' | sort -u
}

# ── Données ─────────────────────────────────────────────────────────────

REGISTRY_IDS=$(extract_registry_ids)
APP_OPEN_IDS=$(grep -oP 'fp\.open\("\K[^"]+' "$APP" | sort -u)
APP_RENDER_IDS=$(grep -oP 'panel\.id === "\K[^"]+' "$APP" | sort -u)
APP_ALL_IDS=$( { echo "$APP_OPEN_IDS"; echo "$APP_RENDER_IDS"; } | sort -u)
LEGACY_TARGETS=$(extract_legacy_map)

# Détection sidebar : panneaux non-détachables vérifiés par présence dans App.tsx
sidebar_only_ids="characters campaign-info"

echo "   Registre : $(echo "$REGISTRY_IDS" | wc -l) IDs"
echo "   App.tsx  : $(echo "$APP_ALL_IDS" | wc -l) IDs utilisés"
echo ""

# ── 1. Cohérence registre ↔ App.tsx ──────────────────────────────────

echo "─── 1. Panneaux actifs vs App.tsx ───"

# Extraire les IDs avec status "active" depuis GM_PANELS
active_ids=$(
  python3 -c "
import re
with open('$REGISTRY') as f:
    text = f.read()
# Extraire le bloc GM_PANELS
m = re.search(r'export const GM_PANELS.*?= \[(.*?)\];', text, re.DOTALL)
if not m:
    exit(1)
block = m.group(1)
# Trouver chaque entrée avec son statut
entries = re.findall(r'id:\s*\"(\S+?)\".*?status:\s*\"(\S+?)\"', block, re.DOTALL)
for id_, status in entries:
    print(f'{id_} {status}')
" 2>/dev/null
)

legacy_in_app=""
missing_from_app=""
while IFS=' ' read -r id status; do
  [[ -z "$id" ]] && continue
  # Vérifier si cet ID ou son alias legacy est dans App.tsx
  found=0
  if echo "$APP_ALL_IDS" | grep -qFx "$id"; then
    found=1
  fi
  # Chercher dans le mapping legacy inverse
  for legacy_id in quickactions sessionlog dice encounter messages dungeon stats; do
    target=$(grep -oP "$legacy_id:\s*\"\K[^\"]+" "$REGISTRY" 2>/dev/null || echo "")
    if [[ "$target" == "$id" ]] && echo "$APP_ALL_IDS" | grep -qFx "$legacy_id"; then
      found=1
      legacy_in_app="$legacy_in_app    ⚠️  $id ← via legacy '$legacy_id' (à migrer en PANEL-2)\n"
    fi
  done
  # Chercher dans les IDs sidebar-only
  if echo "$sidebar_only_ids" | grep -qFw "$id" 2>/dev/null; then
    found=1
  fi

  if [[ $found -eq 0 ]] && [[ "$status" == "active" ]] && [[ "$id" != "settings-placeholder" ]]; then
    missing_from_app="$missing_from_app    ❌ $id ($status) — absent d'App.tsx\n"
  fi
done <<< "$active_ids"

if [[ -n "$legacy_in_app" ]]; then
  echo -e "$legacy_in_app"
fi
if [[ -n "$missing_from_app" ]]; then
  echo -e "$missing_from_app"
  ERRORS=$((ERRORS + 1))
else
  echo "   ✅ Tous les panneaux actifs sont présents dans App.tsx"
fi

# ── 2. IDs dupliqués ─────────────────────────────────────────────────

echo ""
echo "─── 2. IDs dupliqués dans le registre ───"

dup_ids=$(echo "$REGISTRY_IDS" | sort | uniq -d)
if [[ -n "$dup_ids" ]]; then
  echo "   ❌ IDs en doublon dans GM_PANELS : $dup_ids"
  ERRORS=$((ERRORS + 1))
else
  echo "   ✅ Aucun ID dupliqué"
fi

# ── 3. Panneaux flottants → rendu JSX ──────────────────────────────

echo ""
echo "─── 3. Cohérence fp.open() ↔ panel.id ───"

float_ok=1
for id in $APP_OPEN_IDS; do
  if ! echo "$APP_RENDER_IDS" | grep -qFx "$id"; then
    echo "   ❌ fp.open(\"$id\") sans rendu JSX correspondant"
    float_ok=0
  fi
done
for id in $APP_RENDER_IDS; do
  if ! echo "$APP_OPEN_IDS" | grep -qFx "$id"; then
    echo "   ⚠️  panel.id === \"$id\" sans fp.open() (sidebar uniquement ?)"
  fi
done
if [[ $float_ok -eq 1 ]]; then
  echo "   ✅ Tous les fp.open() ont un rendu panel.id correspondant"
else
  ERRORS=$((ERRORS + 1))
fi

# ── 4. Legacy VttBoard ───────────────────────────────────────────────

echo ""
echo "─── 4. Références legacy VttBoard.tsx ───"

vtt_count=$(grep -rl "VttBoard" "$ROOT/scripts/" 2>/dev/null | grep -v "check-gm-panels-current" | wc -l || true)
if [[ $vtt_count -gt 0 ]]; then
  echo "   ⚠️  $vtt_count script(s) référencent VttBoard.tsx (→ PANEL-5)"
else
  echo "   ✅ Aucun script ne référence VttBoard.tsx"
fi

# ── 5. Source unique ─────────────────────────────────────────────────

echo ""
echo "─── 5. Registre unique ───"

others=$(find "$ROOT/frontend/src" -name "*.ts" -o -name "*.tsx" | \
  xargs grep -l "export const.*PANELS.*:.*GmPanelDefinition" 2>/dev/null | \
  grep -v "gmPanels.ts" || true)
if [[ -n "$others" ]]; then
  echo "   ❌ Autre registre détecté : $others"
  ERRORS=$((ERRORS + 1))
else
  echo "   ✅ gmPanels.ts est l'unique registre"
fi

# ── Résumé ───────────────────────────────────────────────────────────

echo ""
echo "═══════════════════════════════════════════"
if [[ $ERRORS -eq 0 ]]; then
  echo "✅ Tous les checks passent"
else
  echo "❌ $ERRORS erreur(s)"
fi
echo "═══════════════════════════════════════════"

exit $ERRORS
