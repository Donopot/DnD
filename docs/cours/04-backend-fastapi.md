# 04 — Backend FastAPI

## Rôle du backend

Le backend expose l'API du produit. Il reçoit les requêtes du frontend, vérifie les permissions, lit ou écrit dans PostgreSQL, utilise Redis et gère les fichiers via MinIO.

## Fichiers importants

```text
backend/app/main.py
backend/app/config.py
backend/app/db.py
backend/app/routers/
backend/app/schemas.py
backend/app/security.py
backend/tests/
```

## Concepts importants

- `main.py` crée l'application FastAPI et inclut les routers.
- `routers/` contient les endpoints par domaine.
- `schemas.py` contient les modèles Pydantic utilisés pour valider les données.
- `db.py` initialise la connexion PostgreSQL et lance les migrations.
- `security.py` gère les mots de passe et les tokens JWT.

## Commandes de validation

```bash
cd /home/donopot/dnd-saas
python3 -m compileall backend/app
sh scripts/check-api-surface.sh
sh scripts/smoke-backend.sh
```

## Lire une route

Pour comprendre une route, cherche :

1. le router dans `backend/app/routers/` ;
2. le schéma Pydantic dans `schemas.py` ;
3. les requêtes SQL dans la fonction ;
4. les vérifications de permissions.

## Exercice

Trouve la route `/api/auth/login`, explique ce qu'elle reçoit, ce qu'elle vérifie et ce qu'elle retourne.
