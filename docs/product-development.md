# Développement produit - DnD SaaS

## Positionnement

`dnd-saas` est le dépôt full-stack du produit.

Il contient :

- le frontend React/Vite ;
- le backend FastAPI ;
- les migrations PostgreSQL ;
- le stockage MinIO/S3 ;
- le temps réel WebSocket ;
- les scripts de smoke test ;
- la documentation ;
- la configuration Docker pour le HP Mini.

## Principe fondamental

Le backend est la source de vérité des données.

Le frontend est le client produit principal, mais il ne doit pas devenir une source de vérité durable.

À éviter :

- données métier uniquement en localStorage ;
- logique de permission uniquement frontend ;
- règles métier dupliquées sans validation backend ;
- fonctionnalités UI non couvertes par API ou smoke test.

## Règles backend

Chaque évolution backend doit avoir :

- migration SQL dédiée si nécessaire ;
- schémas Pydantic ;
- router ou endpoint cohérent ;
- permissions par rôle ;
- smoke test ;
- documentation ;
- validation Docker.

## Règles frontend

Chaque évolution frontend doit avoir :

- TypeScript OK ;
- build Vite OK ;
- appels API centralisés autant que possible ;
- fallback local uniquement temporaire ;
- états d’erreur visibles ;
- comportement responsive vérifié ;
- documentation si l’usage change.

## Validation minimale avant merge

```bash
python3 -m compileall backend/app
sh scripts/check-frontend-types.sh
docker compose up -d --build
sh scripts/wait-api.sh
curl -fsS http://127.0.0.1:8091/api/health
sh scripts/smoke-backend.sh
Ordre de priorité des branches
documentation ;
cohérence environnement / Docker ;
build reproductible ;
refactor API client ;
sécurité backend ;
WebSocket ;
permissions ;
design tokens ;
layout ;
navigation ;
UX carte.
HP Mini

Le HP Mini héberge le produit complet :

frontend ;
backend ;
base de données ;
stockage ;
reverse proxy ;
scripts de maintenance.

Le dépôt doit rester déployable en une commande :

docker compose up -d --build

