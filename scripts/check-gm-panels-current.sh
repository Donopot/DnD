#!/usr/bin/env bash
# check-gm-panels-current.sh
# Vérifie la cohérence entre le registre gmPanels.ts et l'implémentation.
# Post-PanelRenderer: vérifie panelRenderer.tsx + GmWorkspace.tsx + GmFloatingPanels.tsx.
# PANEL-1 — créé avec le registre unique gmPanels.ts.
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

# PanelRenderer.tsx → switch/case panelId
RENDERER_IDS=$(grep -oP 'case\s+"\K[^"]+' "$RENDERER" 2>/dev/null | sort -u || true)

# GmWorkspace.tsx → fp.open(id)
FP_OPEN_IDS=$(grep -oP 'fp\.open\(\"\K[^\"]+' "$WORKSPACE" 2>/dev/null | sort -u || true)

# GmFloatingPanels.tsx → floating panel IDs (case "id")
FLOAT_IDS=$(grep -oP 'case\s+"\K[^"]+' "$FLOATING" 2>/dev/null | sort -u || true)

# Tous les IDs rendus / ouverts (union des 3 sources)
ALL_IDS=$( { echo "$RENDERER_IDS"; echo "$FP_OPEN_IDS"; echo "$FLOAT_IDS"; } | sort -u)

LEGACY_TARGETS=$(extract_legacy_map || true)

# Détection sidebar : panneaux non-détachables vérifiés par présence dans le registre
sidebar_only_ids="characters campaign-info"

echo "   Registre       : $(echo "$REGISTRY_IDS" | wc -l) IDs"
echo "   PanelRenderer  : $(echo "$RENDERER_IDS" | wc -l) panels"
echo "   GmWorkspace    : $(echo "$FP_OPEN_IDS" | wc -l) fp.open()"
echo "   Floating       : $(echo "$FLOAT_IDS" | wc -l) floating panels"
echo ""

# ── 1. Cohérence registre ↔ implémentation ──────────────────────────

echo "─── 1. Panneaux actifs vs implémentation ───"

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

legacy_in_impl=""
missing_from_impl=""
while IFS=' ' read -r id status; do
  [[ -z "$id" ]] && continue
  # Vérifier si cet ID ou son alias legacy est présent dans l'implémentation
  found=0
  if echo "$ALL_IDS" | grep -qFx "$id"; then
    found=1
  fi
  # Chercher dans le mapping legacy inverse
  for legacy_id in quickactions sessionlog dice encounter messages dungeon stats; do
    target=$(grep -oP "$legacy_id:\s*\"\K[^\"]+" "$REGISTRY" 2>/dev/null || echo "")
    if [[ "$target" == "$id" ]] && echo "$ALL_IDS" | grep -qFx "$legacy_id"; then
      found=1
      legacy_in_impl="$legacy_in_impl    ⚠️  $id ← via legacy '$legacy_id' (à migrer en PANEL-2)\n"
    fi
  done
  # Chercher dans les IDs sidebar-only
  if echo "$sidebar_only_ids" | grep -qFw "$id" 2>/dev/null; then
    found=1
  fi

  if [[ $found -eq 0 ]] && [[ "$status" == "active" ]] && [[ "$id" != "settings-placeholder" ]]; then
    missing_from_impl="$missing_from_impl    ❌ $id ($status) — absent de l'implémentation\n"
  fi
done <<< "$active_ids"

if [[ -n "$legacy_in_impl" ]]; then
  echo -e "$legacy_in_impl"
fi
if [[ -n "$missing_from_impl" ]]; then
  echo -e "$missing_from_impl"
  ERRORS=$((ERRORS + 1))
else
  echo "   ✅ Tous les panneaux actifs sont présents dans l'implémentation"
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

# Panneaux non-détachables (sidebar uniquement) — pas de fp.open attendu
# Liste maintenue manuellement (panneaux avec detachable: false dans gmPanels.ts)
sidebar_only_ids="characters campaign-info settings-placeholder"

float_ok=1
for id in $FP_OPEN_IDS; do
  # Vérifier que chaque fp.open() a un rendu correspondant (PanelRenderer ou Floating)
  found_render=0
  if echo "$RENDERER_IDS" | grep -qFx "$id"; then found_render=1; fi
  if echo "$FLOAT_IDS" | grep -qFx "$id"; then found_render=1; fi
  if [[ $found_render -eq 0 ]]; then
    echo "   ❌ fp.open(\"$id\") sans rendu JSX correspondant"
    float_ok=0
  fi
done
for id in $RENDERER_IDS $FLOAT_IDS; do
  if ! echo "$FP_OPEN_IDS" | grep -qFx "$id"; then
    # Vérifier si c'est un panneau non-detachable (normal)
    if echo "$sidebar_only_ids" | grep -qFw "$id"; then
      : # ok — panneau sidebar-only
    else
      echo "   ⚠️  panel.id === \"$id\" sans fp.open() (sidebar uniquement ?)"
    fi
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

# ── 6. Cohérence SESSION_LIVE_PANEL_SETS ───────────────────────────

echo ""
echo "─── 6. Modes session live → panneaux ───"

LIVE_SETS="$ROOT/frontend/src/config/sessionLiveModes.ts"
if [[ -f "$LIVE_SETS" ]]; then
  # Extraire tous les IDs de SESSION_LIVE_PANEL_SETS
  live_ids=$(
    python3 -c "
import re
with open('$LIVE_SETS') as f:
    text = f.read()
# Trouver la constante SESSION_LIVE_PANEL_SETS
start = text.find('SESSION_LIVE_PANEL_SETS')
if start == -1:
    exit(1)
# Trouver l'accolade ouvrante après le =
eq = text.index('=', start)
brace = text.index('{', eq)
# Compter les accolades pour trouver la fermeture
depth = 0
end = brace
for i in range(brace, len(text)):
    if text[i] == '{': depth += 1
    elif text[i] == '}':
        depth -= 1
        if depth == 0:
            end = i + 1
            break
block = text[brace:end]
# Extraire toutes les chaînes entre guillemets qui ressemblent à des IDs de panneaux
mode_keys = {'exploration','combat','roleplay','quick-prep','minimal'}
ids = set(re.findall(r'\"([a-z][-a-z0-9]*)\"', block))
panel_ids = ids - mode_keys
for pid in sorted(panel_ids):
    print(pid)
" 2>/dev/null
  )

  # Extraire les IDs actifs du registre
  active_ids_py=$(grep -B5 '"active"' "$REGISTRY" | grep -oP 'id:\s*"\K[^"]+' | sort -u | tr '\n' ' ')

  live_bad=""
  for id in $live_ids; do
    if ! echo "$active_ids_py" | grep -qFw "$id"; then
      live_bad="$live_bad $id"
    fi
  done

  if [[ -n "$live_bad" ]]; then
    echo "   ❌ IDs dans SESSION_LIVE_PANEL_SETS non-actifs :$live_bad"
    ERRORS=$((ERRORS + 1))
  else
    echo "   ✅ Tous les IDs des mode sets sont des panneaux actifs"
  fi

  # Vérifier qu'aucun panneau actif détachable n'est orphelin
  detachable_active=$(grep -B5 '"active"' "$REGISTRY" | grep -B3 'detachable: true' | grep -oP 'id:\s*"\K[^"]+' | sort -u | tr '\n' ' ' || true)

  orphan_panels=""
  for id in $detachable_active; do
    [[ -z "$id" ]] && continue
    if ! echo "$live_ids" | grep -qFw "$id"; then
      orphan_panels="$orphan_panels $id"
    fi
  done

  if [[ -n "$orphan_panels" ]]; then
    echo "   ⚠️  Panneaux actifs orphelins (dans aucun mode) :$orphan_panels"
  else
    echo "   ✅ Aucun panneau actif orphelin"
  fi
else
  echo "   ⚠️  $LIVE_SETS introuvable"
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
