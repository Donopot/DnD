# Déploiement — D&D Virtual Tabletop

> Dernière mise à jour : 2026-06-02

## Architecture

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

## 1. Déploiement HP Mini (recommandé)

Déploiement autosuffisant sur le serveur domestique `dtmini.com`.
Tous les services tournent en local via Docker Compose, isolés des autres projets.

### 1.1 Prérequis

- Accès SSH au HP Mini
- Docker et Docker Compose installés
- Caddy déjà en place (reverse proxy partagé)
- DNS : `dnd.dtmini.com` → IP publique du HP Mini

### 1.2 Structure sur le HP Mini

```
/home/donopot/
├── .env                    ← secrets globaux (un niveau au-dessus du repo)
├── dnd-saas/               ← ce repo (git clone)
├── mon-saas/               ← SaaS documentaire (séparé, ne pas toucher)
└── vph-saas/               ← autre projet (séparé, ne pas toucher)
```

Le `.env` est **volontairement absent du repo** (contient les secrets).
Il est placé dans `/home/donopot/` et monté via `env_file: - .env` dans Docker Compose.

### 1.3 Mise en place initiale

```bash
# 1. Cloner le repo
cd /home/donopot
git clone git@github.com:Donopot/DnD.git dnd-saas
cd dnd-saas

# 2. Copier et remplir le .env (dans /home/donopot, PAS dans le repo)
cp .env.example /home/donopot/.env
nano /home/donopot/.env
```

Remplacer tous les `change-me-*` par des secrets uniques.
Ne **jamais** réutiliser un secret du SaaS documentaire.

> ⚠️ Le `.env` est lu depuis le répertoire parent (`/home/donopot/`), pas depuis le repo.
> C'est pour ça qu'il n'apparaît pas dans `git status`.

### 1.4 Variables d'environnement (.env)

```ini
# Project
COMPOSE_PROJECT_NAME=dnd_saas

# Ports loopback (exposés uniquement sur 127.0.0.1)
DND_FRONTEND_PORT=8090
DND_BACKEND_PORT=8091

# Backend
BACKEND_ENV=production
BACKEND_CORS_ORIGINS=https://dnd.dtmini.com
BACKEND_SECRET_KEY=<openssl rand -hex 32>

# PostgreSQL
POSTGRES_DB=dnd_app
POSTGRES_USER=dnd_app
POSTGRES_PASSWORD=<mot de passe unique>
DATABASE_URL=postgresql://dnd_app:<password>@dnd-postgres:5432/dnd_app

# Redis
REDIS_URL=redis://dnd-redis:6379/0

# MinIO
MINIO_ROOT_USER=dnd_minio_admin
MINIO_ROOT_PASSWORD=<mot de passe unique>
MINIO_ENDPOINT=http://dnd-minio:9000
MINIO_BUCKET=dnd-assets
MINIO_ACCESS_KEY=dnd_minio_admin
MINIO_SECRET_KEY=<identique à MINIO_ROOT_PASSWORD>
```

### 1.5 Démarrage

```bash
cd /home/donopot/dnd-saas
docker compose up -d --build
```

Conteneurs attendus :

```
dnd-frontend      → 127.0.0.1:8090
dnd-backend       → 127.0.0.1:8091
dnd-postgres      → interne
dnd-minio         → interne
dnd-minio-init    → (one-shot, création du bucket)
dnd-redis         → interne
```

### 1.6 Configuration Caddy

Ajouter le bloc suivant à la configuration Caddy existante du HP Mini,
puis recharger :

```caddy
dnd.dtmini.com {
  encode zstd gzip

  handle /api/* {
    reverse_proxy 127.0.0.1:8091
  }

  handle /ws/* {
    reverse_proxy 127.0.0.1:8091
  }

  handle {
    reverse_proxy 127.0.0.1:8090
  }
}
```

```bash
# Si Caddy tourne en natif :
sudo caddy reload --config /etc/caddy/Caddyfile

# Si Caddy est dans un conteneur Docker (documentary SaaS) :
#   → conserver la même logique de routage
#   → s'assurer qu'il peut atteindre l'host loopback
#   → ne PAS attacher Caddy aux réseaux DnD (postgres, minio, redis)
```

### 1.7 Tests de santé

```bash
# Vérifier le backend (doit retourner "status": "ok")
curl -fsS http://127.0.0.1:8091/api/health | jq

# Vérifier le frontend (doit retourner HTTP 200)
curl -I http://127.0.0.1:8090

# Vérifier via le domaine public (HTTPS)
curl -fsS https://dnd.dtmini.com/api/health | jq
```

Réponse attendue :

```json
{
  "service": "dnd-backend",
  "status": "ok",
  "database": "ok",
  "object_storage": "ok"
}
```

### 1.8 Sauvegardes

```bash
cd /home/donopot/dnd-saas
sh scripts/backup-postgres.sh
sh scripts/backup-minio.sh
```

Cron recommandé (indépendant du SaaS documentaire) :

```cron
15 2 * * * cd /home/donopot/dnd-saas && sh scripts/backup-postgres.sh
45 2 * * * cd /home/donopot/dnd-saas && sh scripts/backup-minio.sh
```

### 1.9 Mise à jour

```bash
cd /home/donopot/dnd-saas
git pull
docker compose up -d --build
docker compose logs -f --tail=50 dnd-backend   # vérifier que ça démarre
```

Les migrations Alembic sont appliquées automatiquement au démarrage du backend.

---

## 2. Déploiement Render (cloud)

Déploiement alternatif sur [Render](https://render.com), utilisant le Blueprint
`render.yaml` présent dans le repo.

> ⚠️ Render ne fournit pas de PostgreSQL, Redis ou S3 nativement.
> Il faut provisionner ces services en externe (tous ont des plans gratuits).

### 2.1 Services externes requis

| Service     | Fournisseur recommandé | Plan gratuit          |
|-------------|------------------------|-----------------------|
| PostgreSQL  | [Neon](https://neon.tech)       | 0.5 GB, 1 projet      |
| Redis       | [Upstash](https://upstash.com)  | 256 MB, 10k req/jour  |
| S3          | [Cloudflare R2](https://developers.cloudflare.com/r2/) | 10 GB, pas de frais egress |

### 2.2 Procédure

1. **Provisionner les services externes** et noter les URLs/connexions.
2. **Créer un groupe d'env `dnd-shared`** dans le dashboard Render avec toutes les variables ci-dessous.
3. **Connecter le Blueprint** : Render → New → Blueprint → repo `Donopot/DnD`.
4. Après le 1er déploiement de l'API, **configurer `VITE_API_URL`** avec l'URL du backend Render (`https://dnd-api.onrender.com`).

### 2.3 Variables d'environnement (`dnd-shared`)

| Variable               | Rôle                             | Source                  |
|------------------------|----------------------------------|-------------------------|
| `BACKEND_CORS_ORIGINS` | Autorise le frontend à appeler l'API | URL du frontend Render  |
| `BACKEND_SECRET_KEY`   | Signe les tokens JWT             | `openssl rand -hex 32`  |
| `DATABASE_URL`         | Connexion PostgreSQL             | Neon / Supabase         |
| `REDIS_URL`            | Cache + sessions                 | Upstash                 |
| `MINIO_ENDPOINT`       | Endpoint S3-compatible           | Cloudflare R2           |
| `MINIO_BUCKET`         | Nom du bucket                    | `dnd-assets`            |
| `MINIO_ACCESS_KEY`     | Clé d'accès S3                   | Dashboard R2            |
| `MINIO_SECRET_KEY`     | Secret S3                        | Dashboard R2            |
| `VITE_API_URL`         | URL du backend pour le frontend  | `https://dnd-api.onrender.com` |

### 2.4 Services définis dans `render.yaml`

- **`dnd-api`** (web) — backend FastAPI via `backend/Dockerfile`, expose `/api/health`
- **`dnd-frontend`** (static) — SPA React/Vite, build depuis `frontend/`, fallback SPA sur `/*`

### 2.5 Checklist Render

- [ ] PostgreSQL externe provisionné (Neon/Supabase)
- [ ] Redis externe provisionné (Upstash)
- [ ] S3 externe provisionné (Cloudflare R2)
- [ ] Groupe d'env `dnd-shared` créé avec toutes les variables
- [ ] Blueprint connecté au repo `Donopot/DnD`
- [ ] `VITE_API_URL` configuré après 1er déploiement API
- [ ] Santé : `curl https://dnd-api.onrender.com/api/health`

---

## 3. Fichiers de déploiement dans le repo

| Fichier                        | Rôle                                        |
|--------------------------------|---------------------------------------------|
| `docker-compose.yml`           | Stack complète HP Mini (6 services)          |
| `.env.example`                 | Template des variables d'environnement       |
| `Dockerfile` (backend/)        | Image backend FastAPI (Python 3.12-slim)     |
| `Dockerfile` (frontend/)       | Build Node 22 + serve Nginx (SPA)            |
| `nginx.conf` (frontend/)       | Configuration Nginx (gzip, cache, fallback)  |
| `render.yaml`                  | Blueprint Render (2 services)                |
| `.node-version`                | Pin Node 22.11.0 pour Render                 |
| `infra/caddy/Caddyfile.dnd.example` | Bloc Caddy à ajouter sur le HP Mini     |
| `scripts/backup-postgres.sh`   | Sauvegarde PostgreSQL                        |
| `scripts/backup-minio.sh`      | Sauvegarde MinIO (assets)                    |
