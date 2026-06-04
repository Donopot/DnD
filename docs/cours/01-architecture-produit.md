# 01 — Architecture produit

## Idée principale

`dnd-saas` est le produit complet. Il contient le frontend, le backend, la configuration Docker, les scripts et la documentation.

Le frontend sert l'interface utilisateur. Le backend garde les données et applique les règles métier.

## Composants

- `frontend/` : application React et Vite.
- `backend/` : API FastAPI.
- `backend/app/routers/` : endpoints API par domaine.
- `backend/app/migrations/` : migrations SQL PostgreSQL.
- `scripts/` : contrôles, smoke tests et utilitaires.
- `.github/workflows/` : CI GitHub Actions.
- `docs/` : documentation projet.

## Flux simplifié

```text
Navigateur
  -> frontend Nginx
  -> /api vers backend FastAPI
  -> PostgreSQL / Redis / MinIO
```

## Règles à retenir

Le backend est la source de vérité.

Le frontend peut améliorer l'expérience utilisateur, mais il ne doit pas être le seul endroit où une permission est vérifiée.

Une base vide doit pouvoir être recréée par les migrations.

## Commandes d'observation

```bash
cd /home/donopot/dnd-saas

ls
cat docker-compose.yml
sed -n '1,180p' backend/app/main.py
ls backend/app/routers
ls backend/app/migrations
```

## Exercice

Écris le rôle de chaque dossier : `backend`, `frontend`, `scripts`, `docs`, `.github`.
