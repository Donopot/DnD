#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

if [ ! -d frontend/node_modules ]; then
  echo "frontend/node_modules absent. Installation des dépendances frontend..."
  cd frontend

  if [ -f package-lock.json ]; then
    npm ci
  else
    npm install
  fi

  cd ..
fi

cd frontend

echo "TypeScript check..."
npx tsc -b --pretty false
