#!/usr/bin/env bash
# check-color-literals.sh — CI guard: reject new literal hex colors in non-whitelisted files.
# All CSS and TSX colors must go through design tokens (tokens.css).
#
# Whitelist:
#   - tokens.css (tokens themselves are literal by definition)
#   - themes.css (light theme overrides)
#   - _archive/ (legacy, not maintained)
#   - .test., .spec., .stories. files (test fixtures)
# Allowed colors (universal / dynamic game data):
#   - #fff / #ffffff (white)
#   - Game data: DEFAULT_COLOR, disposition colors
#   - Canvas fog rendering (CampaignMap, FogLayer)

set -euo pipefail

cd "$(dirname "$0")/../frontend/src"

WHITELIST_PAT='(tokens\.css|themes\.css|_archive|\.test\.|\.spec\.|\.stories\.)'
ROOT="."

violations=0
while IFS= read -r file; do
  if echo "$file" | grep -qE "$WHITELIST_PAT"; then
    continue
  fi
  matches=$(grep -Pn --color=never '(?<![a-zA-Z.-])#[0-9a-fA-F]{3,8}(?![a-zA-Z0-9-])' "$file" || true)
  if [ -n "$matches" ]; then
    echo "❌ $file — literal color(s) found:"
    echo "$matches" | sed 's/^/  /'
    violations=$((violations + 1))
  fi
done < <(find "$ROOT" \( -name '*.css' -o -name '*.tsx' \) -type f)

if [ "$violations" -gt 0 ]; then
  echo ""
  echo "🚫 $violations file(s) with literal hex colors."
  echo "   Migrate them to design tokens in tokens.css, or whitelist the file."
  exit 1
fi

echo "✅ No unauthorized color literals found."
