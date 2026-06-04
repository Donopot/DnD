# 10 — Tests, qualité, Ruff et Biome

## À quoi sert Ruff ?

Ruff est un outil de qualité pour Python. Il vérifie rapidement le code backend et détecte des problèmes comme :

- imports inutilisés ;
- variables inutilisées ;
- erreurs de style ;
- patterns risqués ;
- règles de format ou de lisibilité.

Dans ce projet, Ruff est lancé dans la CI backend avant `compileall` et `pytest`.

## À quoi sert Biome ?

Biome joue un rôle similaire côté frontend. Il vérifie le code TypeScript / React : style, règles de lint, imports, conventions.

## À quoi servent les tests ?

Les tests vérifient que le comportement attendu reste vrai après les modifications.

Types de tests du projet :

- tests unitaires backend ;
- smoke tests API ;
- checks TypeScript ;
- build frontend ;
- checks de surface API ;
- scans sécurité ;
- audits de composants.

## Fichiers importants

```text
.github/workflows/ci.yml
backend/tests/
scripts/smoke-backend.sh
scripts/check-api-surface.sh
scripts/check-frontend-types.sh
frontend/package.json
```

## Commandes backend sans uv

Si `uv` n'est pas installé sur le HP Mini :

```bash
cd /home/donopot/dnd-saas
source venv/bin/activate
python3 -m pip install ruff pytest pytest-asyncio httpx

cd backend
python3 -m ruff check .
python3 -m compileall -q app/
python3 -m pytest --tb=short -q
```

## Commandes frontend

```bash
cd /home/donopot/dnd-saas/frontend
npm ci
npx tsc --noEmit
npx biome check --max-diagnostics=50 .
npm run build
```

## Commandes globales

```bash
cd /home/donopot/dnd-saas
python3 -m compileall backend/app
sh scripts/check-api-surface.sh
sh scripts/check-frontend-types.sh
sh scripts/wait-api.sh
sh scripts/smoke-backend.sh
```

## Exercice

Lance Ruff sur le backend et corrige une erreur simple si elle apparaît.
