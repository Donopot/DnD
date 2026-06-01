# Règles Développeur Expert — Projet DnD VTT

> À respecter impérativement. Tout écart doit être justifié dans le commit.

---

## 1. Architecture et conventions projet

### 1.1 Structure obligatoire
- **1 migration SQL par phase** : `backend/app/migrations/NNN_phaseN_description.sql`
  - Numérotation séquentielle (008, 009, ...)
  - Toujours idempotente (`create table if not exists`, `add column if not exists`)
  - Pas de modification des migrations existantes
- **1 router par domaine** : `backend/app/routers/nom.py`
  - Si le domaine existe déjà, enrichir le router existant
  - Nouveau domaine = nouveau fichier
- **Schémas dans `schemas.py`** : tous les Pydantic au même endroit
  - Suffixe convention : `CreateRequest`, `UpdateRequest`, `Public`
- **1 smoke test shell** : `scripts/smoke-phaseN.sh`
  - Doit finir par `phaseN-smoke-ok` sur succès
  - Utilise `curl -fsS` et `jq`
- **1 doc markdown** : `docs/phase-N-description.md`

### 1.2 Conventions de nommage
- Routes API : `/api/campaigns/{campaign_id}/ressource` (pluriel pour collections)
- Fonctions helper : `snake_case`, verbe d'action (`get_x_or_404`, `ensure_x`, `validate_x`)
- Schémas DB : `snake_case` pour colonnes, `camelCase` pour JSONB keys
- Variables d'env : `UPPER_SNAKE_CASE` préfixées `BACKEND_`

### 1.3 Imports
- `from app.xxx import yyy` — toujours absolu
- Pas d'imports circulaires
- Grouper : stdlib → tiers → projet

---

## 2. Qualité du code backend

### 2.1 FastAPI endpoints
- Toujours typer les retours (`response_model=...`, `-> Type`)
- Gérer les erreurs avec `HTTPException` (jamais de `print`/`raise Exception`)
- Codes HTTP explicites : 200, 201, 204, 400, 401, 403, 404, 409, 410, 413, 415, 422
- Valider les entrées côté Pydantic + vérifications métier dans le endpoint

### 2.2 Base de données
- Utiliser `asyncpg` directement (pas d'ORM)
- Transactions explicites quand plusieurs requêtes liées
- `get_pool().fetchrow()` pour 1 résultat, `.fetch()` pour N, `.fetchval()` pour scalaire
- `on conflict` pour les upserts
- Toujours utiliser des paramètres `$1, $2` (jamais d'interpolation string)

### 2.3 Permissions
- `require_campaign_role(campaign_id, user_id, {roles})` pour tout endpoint sensible
- `player` = droits limités, `co_gm` = presque GM, `gm` = tout
- Filtrer `is_hidden` pour les joueurs dans les queries
- Filtrer `visibility` pour les joueurs dans les queries

### 2.4 Schémas Pydantic
- `BaseModel` avec `Field()` pour validation
- `model_dump(exclude_unset=True)` pour les PATCH
- Jamais de `Optional` (utiliser `| None`)
- `from __future__ import annotations` au besoin

---

## 3. Tests et validation

### 3.1 Smoke tests shell
- Indépendant (peut tourner seul ou avec les autres)
- Utilise des fixtures isolées (email unique avec timestamp)
- Vérifie les codes HTTP, les JSON retournés, et l'absence d'erreurs
- Nettoie éventuellement après lui-même
- Convention de sortie : dernière ligne = `phaseN-smoke-ok`

### 3.2 Avant chaque commit
```bash
python -m compileall backend/app   # pas d'erreur de syntaxe
sh scripts/smoke-backend.sh        # les smoke tests existants passent
```

### 3.3 Après chaque phase
```bash
docker compose up -d --build
sh scripts/wait-api.sh
curl -fsS http://127.0.0.1:8091/api/health
sh scripts/smoke-phase{N}.sh       # nouveau smoke test
sh scripts/smoke-backend.sh        # régression
```

---

## 4. Git

### 4.1 Commits
- Format : `type(scope): description`
- Types : `feat`, `fix`, `refactor`, `test`, `docs`, `chore`
- Scope : `backend`, `migration`, `phase{N}`, `smoke`
- Exemple : `feat(backend): add token move endpoint with snap_to_grid`
- Commits atomiques (1 migration = 1 commit, 1 endpoint = 1 commit)
- Commit après chaque tâche réussie

### 4.2 Branches
- Branche par phase : `phase-9-token-ux`
- Merge dans `main` après validation complète

---

## 5. Règles strictes

### 5.1 À faire
✅ Utiliser les helpers existants (`get_scene_or_404`, `require_campaign_role`, etc.)
✅ Broadcast temps réel après chaque mutation d'état partagé
✅ Validation métier côté backend (jamais faire confiance au frontend)
✅ Limites explicites (taille upload, nombre d'éléments, etc.)

### 5.2 À ne pas faire
❌ Modifier une migration existante
❌ Casser un smoke test existant sans le mettre à jour
❌ Ajouter de la logique métier dans main.py
❌ Faire confiance au `user_id` envoyé par le client
❌ Ignorer les cas d'erreur (sauf si trivial)
❌ Dupliquer du code entre routers (extraire dans `deps.py` ou un helper)
❌ Laisser du code commenté ou des `print()` de debug

---

## 6. Stack technique

| Composant | Technologie | Version/Package |
|-----------|------------|-----------------|
| API | FastAPI | Python 3.13 |
| DB | PostgreSQL 16 | asyncpg |
| Auth | JWT HS256 | PyJWT + bcrypt |
| Stockage | MinIO (S3) | boto3 |
| Cache/Broker | Redis | - |
| Validation | Pydantic v2 | pydantic |
| Realtime | WebSocket natif | FastAPI WebSocket |
| Tests API | Shell + curl + jq | bash |

---

## 7. Anti-patrons identifiés

1. **JSONB sans helper** → toujours utiliser `decode_json()` pour lire du JSONB qui peut arriver en string
2. **Oubli de broadcast** → toute mutation de scene/token/combat doit broadcast
3. **Permission laxiste** → `require_campaign_role` AVANT toute opération
4. **Transaction manquante** → tout INSERT multi-tables doit être dans une transaction
