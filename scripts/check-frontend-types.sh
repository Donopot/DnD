#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/../frontend"

echo "== Frontend TypeScript build check =="
npm run build
