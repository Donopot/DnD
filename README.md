# DnD SaaS — Virtual Tabletop auto-hébergé

VTT Donjons & Dragons en navigateur, conçu pour fonctionner sur HP Mini.

Le projet vise une expérience fluide pour une vraie table de jeu : préparation de campagne, session live, carte VTT, tokens, combats, notes, handouts, visibilité MJ/joueur et outils d’improvisation.

## Statut

Beta privée active.

Le socle est fonctionnel :

- authentification ;
- campagnes et invitations ;
- personnages ;
- scènes et tokens ;
- carte VTT ;
- fog of war ;
- WebSocket ;
- combat et initiative ;
- journal de session ;
- handouts ;
- bibliothèque SRD ;
- panneaux MJ dockés et flottants ;
- interface joueur séparée.

Chantiers prioritaires :

- fermer les contournements d'autorisation joueur/MJ ;
- sécuriser les déplacements de tokens et messages privés WebSocket ;
- réparer les parcours fog, homebrew et paramètres ;
- rendre la CI représentative et la toolchain backend reproductible ;
- terminer l'adoption du design system après stabilisation ;
- maintenir une documentation consolidée.

Le plan d'exécution courant est documenté dans
[`docs/work-in-progress/2026-06-10-main-audit-remediation.md`](docs/work-in-progress/2026-06-10-main-audit-remediation.md).

---

## Stack

| Couche | Technologie |
|---|---|
| Frontend | React, TypeScript, Vite |
| Backend | FastAPI, Python |
| Base | PostgreSQL |
| Cache | Redis |
| Assets | MinIO / S3 |
| Temps réel | WebSocket |
| Déploiement | Docker Compose |
| Reverse proxy | Caddy + Nginx frontend |

---

## Architecture rapide

```txt
Navigateur
  ↓ HTTPS
Caddy
  ↓
Frontend Nginx / API backend
  ↓
FastAPI
  ↓
PostgreSQL / Redis / MinIO
```

Principe central :

```txt
Le backend est la source de vérité.
```

Les permissions, les données persistantes et les validations critiques doivent rester côté backend.

---

## Démarrage rapide

```bash
cp .env.example .env
nano .env

docker compose up -d --build
```

Accès local :

```txt
Frontend       http://127.0.0.1:8090
Backend health http://127.0.0.1:8091/api/health
```

Vérification :

```bash
curl -i http://127.0.0.1:8091/api/health
docker compose ps
```

---

## Production HP Mini

Chemin principal :

```txt
/home/donopot/dnd-saas
```

Services :

| Service | Rôle | Port |
|---|---|---|
| `dnd-frontend` | SPA React via Nginx | 127.0.0.1:8090 |
| `dnd-backend` | API FastAPI + WebSocket | 127.0.0.1:8091 |
| `dnd-postgres` | Base PostgreSQL | interne |
| `dnd-redis` | Cache | interne |
| `dnd-minio` | Assets / stockage S3 | interne |

Caddy expose :

```txt
https://dnd.dtmini.com        → frontend
https://dnd.dtmini.com/api/*  → backend
https://dnd.dtmini.com/ws/*   → WebSocket
```

Ne jamais partager les secrets, volumes, buckets ou bases de données avec un autre SaaS.

---

## Fonctionnalités principales

### Maître du Jeu

- Lobby MJ.
- Création et gestion de campagne.
- Invitations joueurs.
- Carte VTT avec zoom, pan, grille, tokens, mini-map, mode focus.
- Fog of War manuel.
- Panneaux dockés et flottants.
- Combat, initiative, rencontres, conditions.
- Notes MJ.
- Messages et journal.
- Documents révélables.
- Bestiaire, sorts, objets, règles SRD, homebrew.
- Actions rapides et dés.

### Joueur

- Lobby joueur.
- Personnages.
- Vue joueur séparée.
- Carte filtrée selon visibilité.
- Dés.
- Journal public.
- Handouts.
- État de combat.

### Carte, tokens et fog

Règle de visibilité joueur :

```txt
Visible joueur = token non caché manuellement ET centre du token dans une zone révélée
```

Côté MJ :

```txt
🙈 = caché manuellement aux joueurs
👁️‍🗨️ = caché par le brouillard de guerre
```

Le fog représente des zones révélées. Le canvas affiche un voile sombre puis découpe les zones révélées.

---

## Développement

Backend :

```bash
cd backend
uv run --no-project uvicorn app.main:app --reload --port 8091
```

Frontend :

```bash
cd frontend
npm ci
npx vite --port 8090
```

Tests :

```bash
cd backend
uv run --no-project pytest tests/ -v
```

```bash
cd frontend
npx tsc --noEmit
npx vite build
```

Déploiement local complet :

```bash
docker compose up -d --build
docker compose logs --tail=200 -f
```

---

## Documentation

La documentation active est dans [`docs/`](docs/README.md).

Documents principaux actuels :

| Besoin | Document |
|---|---|
| Vision produit | [`docs/product-roadmap.md`](docs/product-roadmap.md) |
| Architecture globale | [`docs/02-architecture.md`](docs/02-architecture.md) |
| Interface et panneaux | [`docs/frontend-ui.md`](docs/frontend-ui.md) |
| Carte, tokens, fog | [`docs/vtt-map-fog.md`](docs/vtt-map-fog.md) |
| Backend et API | [`docs/backend-api.md`](docs/backend-api.md) |
| Sécurité et auth | [`docs/security-auth.md`](docs/security-auth.md) |
| Déploiement et opérations | [`docs/deployment-ops.md`](docs/deployment-ops.md) |
| Contenu SRD | [`docs/srd-content.md`](docs/srd-content.md) |

Dossiers utiles :

| Dossier | Rôle |
|---|---|
| [`docs/work-in-progress/`](docs/work-in-progress/) | Plans de PR, audits temporaires, documents de travail |
| [`docs/archive/`](docs/archive/) | Anciennes phases et docs remplacées |
| [`docs/learning/`](docs/learning/) | Notes pédagogiques |
| [`docs/skills/`](docs/skills/) | Notes techniques réutilisables |

Règle de maintenance :

```txt
Pas de nouveau document racine dans docs/ si le contenu peut entrer dans une doc existante.
```

Les plans de PR doivent être intégrés à une doc permanente ou archivés après merge.

---

## Sécurité

- JWT via `Authorization: Bearer`.
- Mots de passe hashés avec bcrypt.
- Rate limiting sur l’authentification.
- CORS configuré par environnement.
- Rôles campagne : `gm`, `co_gm`, `player`.
- Permissions critiques côté backend.
- `.env` exclu du repo.
- Secrets et volumes isolés par projet.

---

## Maintenance serveur

Suivre tous les logs :

```bash
docker compose logs --tail=200 -f
```

Backend seulement :

```bash
docker compose logs --tail=200 -f dnd-backend
```

État des conteneurs :

```bash
docker compose ps
```

Arrêter uniquement DnD SaaS :

```bash
docker compose stop
```

Redémarrer :

```bash
docker compose up -d
```

Ne pas utiliser sauf intention explicite :

```bash
docker compose down -v
```

Cette commande supprime les volumes.

---

## Structure du repo

```txt
backend/    API FastAPI, routers, migrations, tests
frontend/   React/Vite, composants, hooks, styles
docs/       Documentation produit, technique et opérations
scripts/    Scripts de maintenance et vérification
```

---

## Métriques

| Catégorie | Valeur | Détail |
|-----------|--------|--------|
| Tests backend | 122/122 | `uv run --no-project pytest --tb=short -q` |
| Endpoints API | 119 | 18 routeurs FastAPI |
| Schémas Pydantic | 74 | `backend/app/schemas.py` |
| Migrations SQL | 28 | `backend/app/migrations/` |
| Composants React | 58 | `frontend/src/components/` |
| App.tsx | 812 lignes | +20% (infra design system vs v0.12) |
| TypeScript | 0 erreur | `tsc --noEmit` |
| Build | ~750ms | `npm run build` |
| Biome CSS | 0 erreur | Linter strict |

## Priorités techniques actuelles

- Terminé ✅ — Dark Refined : design system, shell v2, map tools, a11y, auth/lobby v2, player view v2, panel polish.
- ✅ Design system : DESIGN.md, tokens.css, Drawer Escape + IconButton Lucide.
- ✅ Validation visuelle : Playwright Axe, responsive.
- 🔴 En cours — Sécurisation joueur/MJ (plan de remédiation — Sprint 1-3 : is_secret, filtrage données, WS permissions, whispers, routes fog/homebrew).
- 🔜 Tests sécurité joueur + e2e authentifié (Sprint 4).
