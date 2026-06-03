# Déploiement & Opérations — D&D Virtual Tabletop

> Fusion de `deployment.md` + `developer-toolchain.md` + `agent-coordination.md`.
> Dernière mise à jour : 2026-06-03.

---

## 1. Infrastructure

```
                    ┌─────────────────────────────────────┐
                    │        Caddy (reverse proxy)         │
                    │     dnd.dtmini.com :443 → loopback   │
                    └─────┬───────────────────┬───────────┘
                          │                   │
              /api/* /ws/*│                   │ /*
                          ▼                   ▼
              ┌──────────────────┐  ┌──────────────────┐
              │   dnd-backend    │  │  dnd-frontend    │
              │  127.0.0.1:8091  │  │  127.0.0.1:8090  │
              │  FastAPI+WS      │  │  Nginx (SPA)      │
              └───┬───┬───┬──────┘  └──────────────────┘
                  │   │   │
         ┌────────┘   │   └────────┐
         ▼            ▼            ▼
   ┌──────────┐ ┌─────────┐ ┌──────────┐
   │PostgreSQL│ │  Redis   │ │  MinIO   │
   │   :5432  │ │  :6379   │ │  :9000   │
   │(critique)│ │(cache)   │ │(assets)  │
   └──────────┘ └─────────┘ └──────────┘
```

### Dépendances des services

| Service     | Utilisé par                        | Critique ? | Fallback si down          |
|-------------|------------------------------------|------------|---------------------------|
| PostgreSQL  | 17/17 routeurs (100% du backend)   | 🔴 OUI     | ❌ Backend mort           |
| Redis       | `vtt.py`, `handouts.py` (cache)    | 🟡 Partiel | ✅ Dégradation gracieuse  |
| MinIO/S3    | `assets.py` (uploads d'images)     | 🟡 Partiel | ❌ Uploads bloqués        |

---

## 2. Docker Compose

### 2.1 Services

| Conteneur         | Rôle                              | Port              |
|-------------------|-----------------------------------|-------------------|
| `dnd-frontend`    | SPA React/Vite via Nginx          | 127.0.0.1:8090    |
| `dnd-backend`     | API FastAPI + WebSocket           | 127.0.0.1:8091    |
| `dnd-postgres`    | Base PostgreSQL                   | Interne           |
| `dnd-redis`       | Cache Redis                       | Interne           |
| `dnd-minio`       | Stockage S3-compatible            | Interne           |
| `dnd-minio-init`  | One-shot création du bucket       | —                 |

Tous les ports sont loopback uniquement — Caddy est le seul point d'entrée public.
Les migrations Alembic s'appliquent automatiquement au démarrage du backend.

### 2.2 Commandes Docker

```bash
cp .env.example .env
docker compose config --quiet       # validation
docker compose up -d --build        # déploiement
docker compose logs -f --tail=50 dnd-backend
docker compose down                 # arrêt
```

### 2.3 Dockerfiles

| Fichier                  | Base               | Rôle                        |
|--------------------------|--------------------|-----------------------------|
| `backend/Dockerfile`     | Python 3.12-slim   | Image backend FastAPI       |
| `frontend/Dockerfile`    | Node 22 + Nginx    | Build SPA + serve Nginx     |
| `frontend/nginx.conf`    | —                  | gzip, cache, fallback SPA   |

---

## 3. Environnement

### 3.1 Gestion des variables

Le `.env` est **absent du repo** (secrets). Il vit à la racine du repo
(`/home/donopot/dnd-saas/.env`) et est chargé via `env_file` dans Docker Compose.
Le modèle versionné est `.env.example`.

> ⚠️ Ne jamais commiter `.env`. Ne jamais réutiliser un secret d'un autre projet.

### 3.2 Variables clés (HP Mini)

```ini
COMPOSE_PROJECT_NAME=dnd_saas
DND_FRONTEND_PORT=8090
DND_BACKEND_PORT=8091
BACKEND_ENV=production
BACKEND_CORS_ORIGINS=https://dnd.dtmini.com
BACKEND_SECRET_KEY=<openssl rand -hex 32>
POSTGRES_DB=dnd_app
POSTGRES_USER=dnd_app
POSTGRES_PASSWORD=<unique>
DATABASE_URL=postgresql://dnd_app:***@dnd-postgres:5432/dnd_app
REDIS_URL=redis://dnd-redis:6379/0
MINIO_ROOT_USER=dnd_minio_admin
MINIO_ROOT_PASSWORD=<unique>
MINIO_ENDPOINT=http://dnd-minio:9000
MINIO_BUCKET=dnd-assets
MINIO_ACCESS_KEY=dnd_minio_admin
MINIO_SECRET_KEY=<identique à MINIO_ROOT_PASSWORD>
```

### 3.3 Variables Render (cloud)

Provisionner PostgreSQL (Neon), Redis (Upstash) et S3 (Cloudflare R2) en externe,
puis définir dans le groupe d'env `dnd-shared` :

| Variable               | Source                  |
|------------------------|-------------------------|
| `BACKEND_CORS_ORIGINS` | URL du frontend Render  |
| `BACKEND_SECRET_KEY`   | `openssl rand -hex 32`  |
| `DATABASE_URL`         | Neon / Supabase         |
| `REDIS_URL`            | Upstash                  |
| `MINIO_ENDPOINT`       | Cloudflare R2            |
| `MINIO_BUCKET`         | `dnd-assets`             |
| `MINIO_ACCESS_KEY`     | Dashboard R2             |
| `MINIO_SECRET_KEY`     | Dashboard R2             |
| `VITE_API_URL`         | `https://dnd-api.onrender.com` |

Services Render définis dans `render.yaml` : `dnd-api` (web, FastAPI) et `dnd-frontend` (static, SPA).

---

## 4. Déploiement

### 4.1 HP Mini — mise en place initiale

```bash
cd /home/donopot
git clone git@github.com:Donopot/DnD.git dnd-saas
cd dnd-saas
cp .env.example .env && nano .env    # remplir tous les change-me-*
```

Structure cible :

```
/home/donopot/
├── dnd-saas/               ← ce repo
│   ├── .env                ← secrets locaux (non commité)
│   └── .env.example        ← modèle versionné
├── mon-saas/               ← autre projet (ne pas toucher)
└── vph-saas/               ← autre projet (ne pas toucher)
```

### 4.2 HP Mini — reverse proxy Caddy

```caddy
dnd.dtmini.com {
  encode zstd gzip
  handle /api/* { reverse_proxy 127.0.0.1:8091 }
  handle /ws/*  { reverse_proxy 127.0.0.1:8091 }
  handle        { reverse_proxy 127.0.0.1:8090 }
}
```

```bash
sudo caddy reload --config /etc/caddy/Caddyfile
```

> Si Caddy est dans un conteneur Docker : s'assurer qu'il peut atteindre l'host
> loopback, et ne **pas** l'attacher aux réseaux DnD (postgres, minio, redis).

### 4.3 Démarrage et tests de santé

```bash
docker compose up -d --build

# Tests
curl -fsS http://127.0.0.1:8091/api/health | jq    # → {"status":"ok",...}
curl -I http://127.0.0.1:8090                       # → HTTP 200
curl -fsS https://dnd.dtmini.com/api/health | jq     # → HTTPS public
```

Réponse attendue :

```json
{"service":"dnd-backend","status":"ok","database":"ok","object_storage":"ok","redis":"ok"}
```

### 4.4 Mise à jour

```bash
cd /home/donopot/dnd-saas
git pull
docker compose up -d --build
docker compose logs -f --tail=50 dnd-backend
```

### 4.5 Render — checklist

- [ ] PostgreSQL externe (Neon/Supabase)
- [ ] Redis externe (Upstash)
- [ ] S3 externe (Cloudflare R2)
- [ ] Groupe d'env `dnd-shared` créé
- [ ] Blueprint connecté au repo
- [ ] `VITE_API_URL` configuré après 1er déploiement API
- [ ] `curl https://dnd-api.onrender.com/api/health`

---

## 5. Toolchain développeur

**Source unique de vérité** — CI, agents IA et développeurs doivent s'y conformer.

### 5.1 Python / Backend

| Outil    | Usage                                |
|----------|--------------------------------------|
| **uv**   | Gestionnaire de paquets + environnement |
| **ruff** | Linting + formatting                  |
| **pytest**| Tests unitaires                      |

```bash
cd backend
uv sync                               # installer (lock via uv.lock)
uv run ruff check .                   # lint
uv run python -m compileall -q app    # compilation check
uv run pytest --tb=short -q           # tests
```

**Interdit :** `pip install`, `python -m venv` manuel, `python3` nu → toujours `uv run python`.

### 5.2 TypeScript / Frontend

| Outil              | Usage                                   |
|--------------------|-----------------------------------------|
| **Node** (`.node-version`) | Version canonique — le fichier fait foi |
| **npm ci**         | Installation reproductible              |
| **tsc**            | Type-checking                           |
| **Biome**          | Linting + formatting                     |
| **Vite**           | Build de production                     |

```bash
cd frontend
npm ci                                # installer (basé sur package-lock.json)
npx tsc --noEmit                      # type-check
npx biome check --max-diagnostics=50 . # lint
npm run build                         # build production
```

**Interdit :** `node-version` hardcodé en CI → utiliser `node-version-file` ; `tsc -b` (pas de project references) ; `npm install` → `npm ci`.

### 5.3 CI (GitHub Actions)

Les workflows CI **doivent** utiliser les mêmes commandes canoniques. Règles :

1. Backend : `uv` via `astral-sh/setup-uv@v5`, pas `pip`
2. Frontend : `node-version-file: frontend/.node-version`, pas hardcodé
3. Orphan audit : `python3 scripts/audit-orphans.py frontend/src` (path explicite)
4. Baseline orphelins : la valeur dans `scripts/pre-commit.sh` fait foi

### 5.4 Pré-commit local

```bash
./scripts/pre-commit.sh          # complet (pytest + build)
./scripts/pre-commit.sh --quick  # rapide (lint + tsc + orphan audit)
```

### 5.5 Justification des règles

| Règle                             | Raison |
|-----------------------------------|--------|
| `uv` pas `pip`                    | Lock reproductible, pas de venv manuel |
| `.node-version` pas hardcodé      | Source unique, CI suit automatiquement |
| `tsc --noEmit` pas `tsc -b`       | Projet sans project references |
| `npm ci` pas `npm install`        | Build déterministe via `package-lock.json` |
| Path explicite audit-orphans      | Fallback hardcodé = local only |

---

## 6. Workflow agent IA

Protocole **contraignant** pour tout agent (Hermes, Codex, etc.) intervenant sur le repo.

### 6.1 Départ de mission

```bash
git status --short --branch
git log --oneline --decorate -5
git fetch origin
```

Si le workspace est sale : créer une **worktree propre** depuis `origin/main`.
**Ne jamais nettoyer/reset les changements d'un autre agent.**

### 6.2 Plans d'implémentation

Emplacement : `.hermes/plans/YYYY-MM-DD-<sujet-court>.md`

```markdown
# <Titre>
## Objectif
Une phrase.
## Tâches
- [ ] Tâche 1 — fichier(s)
- [ ] Tâche 2 — fichier(s)
## Vérification
- [ ] Backend tests pass
- [ ] Frontend build OK
- [ ] Orphan audit clean
## Branche : agent/<type>/<sujet>
## Agent : <nom>
```

### 6.3 Handoff (passation)

Emplacement : `.hermes/handoffs/YYYY-MM-DD-<agent>-<sujet>.md`

```markdown
## Handoff — agent/<type>/<sujet>
### État : Terminé | Partiel | Bloqué
### Contexte
- Branche : agent/<type>/<sujet>
- Commit final : <sha>
- PR : <url>
### Tâches
- [x] Tâche 1 — complétée
- [ ] Tâche 2 — en attente (raison)
### Fichiers modifiés
- backend/app/routers/vtt.py — +150 lignes
### Tests : uv run pytest → 115 passed | tsc → 0 errors | build → OK
### Points d'attention : (cache Redis à flusher, ordre migrations, etc.)
### Commande de reprise
git checkout agent/<type>/<sujet> && uv run pytest --tb=short -q
```

### 6.4 Sessions

Fichier : `.hermes/sessions/<agent>-<date>.md` — branche active, état des tâches, bloqueurs.
Sessions mergées depuis > 7 jours → archiver dans `.hermes/archive/`.

### 6.5 Review entre agents

Vérifier dans l'ordre :
1. Diff = mission annoncée ?
2. Fichiers sensibles limités au nécessaire ?
3. Permissions backend vérifiées côté serveur ?
4. Caches sans contournement de contrôle d'accès ?
5. Frontend compatible avec les schémas API ?
6. CI/pre-commit = toolchain canonique ?
7. Tests couvrent le risque modifié ?

Findings classés `P0` à `P3` avec lien fichier + ligne.

### 6.6 Validation humaine obligatoire

Avant de : modifier la stratégie de migration DB, toucher aux secrets/`.env`/volumes/production,
changer les rôles/permissions, réécrire une surface frontend majeure, merger/fermer/supprimer
une branche/PR d'un autre agent, lancer une commande destructive.

---

## 7. Discipline de branches

### 7.1 Convention

| Agent  | Convention                  | Exemple                          |
|--------|-----------------------------|----------------------------------|
| Hermes | `agent/<type>/<objectif>`   | `agent/fix/security-p1`         |
| Codex  | `codex/<objectif-court>`    | `codex/fix-ci-workflows`        |

Types : `fix`, `feature`, `ui`, `backend`, `db`, `test`, `docs`, `refactor`, `experiment`.
Une branche = une mission. Commits explicites : `ui: simplify gm headers`, `fix: repair ws auth`.

### 7.2 Avant de créer une branche

```bash
git branch -a | grep -E '(agent/|codex/)'
gh pr list --state open 2>/dev/null
```

### 7.3 Règles de collision

| Situation | Règle |
|-----------|-------|
| `fix/*` existe sur le même module | Attendre le merge |
| `feature/*` existe sur le même module | Ne pas ouvrir de 2e feature |
| `docs/*` | Pas de restriction |
| PR > 48h sans merge | Proposer de reprendre, pas de force-push |
| Branche d'un autre agent sur le même sujet | Lire avant de créer |

### 7.4 Fichiers à risque — conflit interdit

```
backend/app/routers/vtt.py        backend/app/routers/session.py
backend/app/routers/characters.py backend/app/routers/handouts.py
frontend/src/App.tsx              frontend/src/components/CampaignMap.tsx
docker-compose.yml                .github/workflows/ci.yml
```

### 7.5 Résolution

| Conflit | Action |
|---------|--------|
| Même fichier, complémentaires | Signaler, proposer ordre de merge |
| Même fichier, incompatibles | Ne pas créer — demander arbitrage |
| Même scope fonctionnel | Attendre ou cibler `integration/ai` |
| Plan existant non complété | Lire le plan, reprendre les tâches |

Tout conflit → section `## Risques` du rapport final.

### 7.6 Précédence des tâches

1. `fix/security-*` (P0/P1 — bloquant tout le reste)
2. `fix/*` (bugs)
3. `test/*`
4. `backend/*`
5. `feature/*`
6. `ui/*`
7. `refactor/*`
8. `docs/*`

### 7.7 Merge : jamais sans validation humaine

```
agent/<type>/<objectif> → PR → validation humaine → integration/ai? → main
```

---

## 8. Sauvegardes & Cron

### 8.1 Scripts

```bash
cd /home/donopot/dnd-saas
sh scripts/backup-postgres.sh    # PostgreSQL
sh scripts/backup-minio.sh       # MinIO (assets)
```

### 8.2 Cron recommandé (HP Mini)

```cron
15 2 * * * cd /home/donopot/dnd-saas && sh scripts/backup-postgres.sh
45 2 * * * cd /home/donopot/dnd-saas && sh scripts/backup-minio.sh
```

Décalage de 15 min pour éviter les conflits I/O.

### 8.3 Zones à risque opérationnel

- **Auth** : JWT, invites, rôles campagne, rate limiting.
- **VTT** : scènes, tokens, fog of war, WebSocket.
- **Visibilité joueur** : handouts, metadata tokens, journal, messages.
- **Cache Redis** : contrôler les permissions avant de retourner une valeur cachée (ou inclure le rôle dans la clé).
- **Markdown/HTML** : `DOMPurify` obligatoire si `dangerouslySetInnerHTML`.
- **CI/toolchain** : ce document doit rester cohérent avec `.github/workflows/ci.yml` et `scripts/pre-commit.sh` ; la baseline orphelins doit être identique.

---

## 9. Fichiers de référence

### 9.1 Fichiers de déploiement

| Fichier                             | Rôle                                     |
|-------------------------------------|------------------------------------------|
| `docker-compose.yml`                | Stack 6 services HP Mini                 |
| `.env.example`                      | Template variables                       |
| `backend/Dockerfile`                | Image FastAPI (Python 3.12-slim)         |
| `frontend/Dockerfile`               | Build Node 22 + Nginx                    |
| `frontend/nginx.conf`               | Config gzip, cache, fallback SPA         |
| `render.yaml`                       | Blueprint Render (2 services)            |
| `.node-version`                     | Pin Node 22.11.0                         |
| `infra/caddy/Caddyfile.dnd.example` | Bloc Caddy HP Mini                       |
| `scripts/backup-postgres.sh`        | Sauvegarde PostgreSQL                    |
| `scripts/backup-minio.sh`           | Sauvegarde MinIO                         |
| `scripts/pre-commit.sh`             | Pré-commit (complet ou --quick)          |
| `scripts/audit-orphans.py`          | Audit imports orphelins                  |

### 9.2 Répertoires de coordination

| Répertoire          | Contenu                     |
|---------------------|-----------------------------|
| `.hermes/plans/`    | Plans d'implémentation      |
| `.hermes/handoffs/` | Passations entre agents     |
| `.hermes/sessions/` | Sessions actives            |
| `.hermes/archive/`  | Sessions archivées          |

### 9.3 Documents liés

| Document                   | Contenu                                    |
|----------------------------|--------------------------------------------|
| `AGENTS.md`                | Règles individuelles (git, sécurité, tests)|
| `docs/deployment-ops.md`   | Ce document                                |

---

> **Règle finale** : un agent ne masque jamais une incertitude. Si une vérification
> n'a pas pu être exécutée, l'indiquer avec la raison et la commande manquante.
