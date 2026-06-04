# 00 — Parcours d'apprentissage du projet DnD SaaS

Ce dossier contient des cours courts, rangés dans l'ordre recommandé pour comprendre, maintenir et développer le projet `dnd-saas`.

## Objectif

Te rendre autonome sur :

- le fonctionnement global du produit ;
- le backend FastAPI ;
- le frontend React / TypeScript ;
- Docker sur le HP Mini ;
- PostgreSQL, Redis et MinIO ;
- l'authentification, les permissions et la sécurité ;
- les panneaux GM / VTT ;
- les tests, la CI, Ruff, Biome et les smoke tests ;
- le debug quotidien sans casser Hermes.

## Ordre recommandé

1. `01-architecture-produit.md`
2. `02-git-github-ci.md`
3. `03-docker-hp-mini.md`
4. `04-backend-fastapi.md`
5. `05-postgresql-migrations.md`
6. `06-auth-permissions-securite.md`
7. `07-frontend-react-typescript.md`
8. `08-ui-panneaux-vtt.md`
9. `09-websocket-temps-reel.md`
10. `10-tests-qualite-ruff-biome.md`
11. `11-debug-maintenance.md`
12. `12-roadmap-apprentissage.md`

## Méthode de travail

Pour chaque cours :

1. lis la théorie ;
2. repère les fichiers du repo cités ;
3. lance les commandes d'observation ;
4. note ce que tu ne comprends pas ;
5. fais une petite modification contrôlée sur une branche Git.

## Commande de base du projet

```bash
cd /home/donopot/dnd-saas
```

## Règle importante

Hermes doit rester disponible. Évite donc les commandes globales qui coupent tout le serveur. Préfère cibler les conteneurs DnD précisément quand tu redémarres ou testes le produit.
