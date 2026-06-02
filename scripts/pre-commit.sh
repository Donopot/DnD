#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# pre-commit.sh — Quality gate before every commit
#
# Runs: ruff (Python lint), tsc (TypeScript), pytest (backend tests),
#       vite build (frontend), audit-orphans (dead code check)
#
# Usage:
#   ./scripts/pre-commit.sh          # check all
#   ./scripts/pre-commit.sh --quick  # skip pytest & build (fast mode)
#   ./scripts/pre-commit.sh --all    # full check (default)
#
# Install as git hook:
#   ln -sf ../../scripts/pre-commit.sh .git/hooks/pre-commit
# ---------------------------------------------------------------------------
set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

MODE="${1:---all}"
PASS=0
FAIL=0
ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"

step()  { echo -e "${CYAN}▶${NC} $*"; }
ok()    { echo -e "  ${GREEN}✅${NC} $*"; ((PASS++)); }
err()   { echo -e "  ${RED}❌${NC} $*"; ((FAIL++)); }
warn()  { echo -e "  ${YELLOW}⚠${NC}  $*"; }
hr()    { echo "───────────────────────────────────────────────────"; }

# ── Python (ruff) ──
step "Ruff — Python lint (backend)"
if command -v ruff &>/dev/null; then
    if ruff check "$ROOT/backend" --quiet 2>&1; then
        ok "Ruff clean"
    else
        err "Ruff found issues — run: ruff check --fix backend/"
    fi
else
    warn "Ruff not installed — skipping"
fi

# ── Python compilation ──
step "Python — compileall"
if python3 -m compileall -q "$ROOT/backend/app" 2>/dev/null; then
    ok "Python compiles clean"
else
    err "Python compilation failed"
fi

# ── Backend tests ──
if [[ "$MODE" != "--quick" ]]; then
    step "Pytest — backend tests"
    if [ -f "$ROOT/backend/pyproject.toml" ] || [ -f "$ROOT/backend/setup.cfg" ]; then
        if (cd "$ROOT/backend" && .venv/bin/python -m pytest --tb=short -q 2>&1); then
            ok "All backend tests pass"
        else
            err "Backend tests failed"
        fi
    else
        warn "No test config found — skipping pytest"
    fi
fi

# ── TypeScript ──
step "TypeScript — tsc"
if (cd "$ROOT/frontend" && npx tsc --noEmit 2>&1); then
    ok "TypeScript clean (0 errors)"
else
    err "TypeScript errors found"
fi

# ── Frontend build ──
if [[ "$MODE" != "--quick" ]]; then
    step "Vite — production build"
    if (cd "$ROOT/frontend" && npm run build -- --logLevel warn 2>&1); then
        ok "Vite build succeeded"
    else
        err "Vite build failed"
    fi
fi

# ── Audit orphelins ──
step "Audit — composants orphelins"
ORPHANS=$(cd "$ROOT" && python3 scripts/audit-orphans.py 2>/dev/null | grep "^  →" | grep -oP '\d+')
BASELINE=13  # 13 components lazy-loaded via React.lazy() in App.tsx
if [ -z "$ORPHANS" ]; then
    ok "No orphan components"
elif [ "$ORPHANS" -le "$BASELINE" ]; then
    ok "Orphan count OK ($ORPHANS ≤ baseline $BASELINE)"
else
    NEW=$((ORPHANS - BASELINE))
    err "$NEW NEW orphan component(s) detected (total: $ORPHANS, baseline: $BASELINE)"
fi

# ── Secrets scan (lightweight) ──
step "Security — secrets scan"
STAGED=$(git diff --cached 2>/dev/null | grep "^+" | grep -Pi "(api_key|secret|password|token)\s*=\s*['\"][^'\"]{6,}['\"]" || true)
if [ -z "$STAGED" ]; then
    ok "No hardcoded secrets in diff"
else
    err "Hardcoded secrets detected in staged changes!"
    echo "$STAGED"
fi

# ── Final ──
hr
echo -e "Result: ${GREEN}${PASS} passed${NC}, ${RED}${FAIL} failed${NC}"

if [ "$FAIL" -gt 0 ]; then
    echo ""
    echo -e "${RED}Commit blocked — fix the issues above.${NC}"
    echo ""
    echo "Fix commands:"
    echo "  ruff check --fix backend/     → auto-fix Python style"
    echo "  python3 scripts/audit-orphans.py   → list orphan components"
    echo "  cd frontend && npx tsc --noEmit    → see TypeScript errors"
    echo ""
    echo "Or skip checks (NOT recommended):"
    echo "  git commit --no-verify"
    exit 1
fi

echo -e "${GREEN}All checks passed — ready to commit.${NC}"
exit 0
