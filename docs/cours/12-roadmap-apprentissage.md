# 12 — Roadmap d'apprentissage

## Niveau 1 — Comprendre le produit

Objectif : savoir expliquer ce que fait chaque grande brique.

À lire :

- `01-architecture-produit.md`
- `02-git-github-ci.md`
- `03-docker-hp-mini.md`

Validation : tu sais relancer DnD sans couper Hermes et tu sais lire l'état Git.

## Niveau 2 — Comprendre le backend

Objectif : comprendre les routes, la base et l'auth.

À lire :

- `04-backend-fastapi.md`
- `05-postgresql-migrations.md`
- `06-auth-permissions-securite.md`

Validation : tu sais trouver une route, lire un schéma Pydantic et diagnostiquer une migration cassée.

## Niveau 3 — Comprendre le frontend

Objectif : comprendre les composants, les appels API et les panneaux.

À lire :

- `07-frontend-react-typescript.md`
- `08-ui-panneaux-vtt.md`
- `09-websocket-temps-reel.md`

Validation : tu sais suivre un clic frontend jusqu'à une route backend.

## Niveau 4 — Qualité et maintenance

Objectif : éviter de casser le produit.

À lire :

- `10-tests-qualite-ruff-biome.md`
- `11-debug-maintenance.md`

Validation : tu sais lancer Ruff, TypeScript, le build, le smoke test et lire une erreur CI.

## Routine avant merge

```bash
cd /home/donopot/dnd-saas
python3 -m compileall backend/app
sh scripts/check-api-surface.sh
sh scripts/check-frontend-types.sh
sh scripts/wait-api.sh
sh scripts/smoke-backend.sh
```

## Routine Git

```bash
git status
git pull --rebase origin main
git push origin main
```

## Objectif final

Être capable de participer au développement avec une méthode stable : comprendre, modifier, tester, documenter, puis merger.
