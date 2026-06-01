# DnD SaaS — Virtual Tabletop

Second SaaS for a Dungeons & Dragons browser-first VTT, designed to run isolated
from the existing documentary SaaS on the HP Mini.

## Architecture

| Composant | Technologie | Port interne |
|-----------|------------|-------------|
| Frontend | React 19 + Vite | 8090 |
| Backend | FastAPI (Python 3.13) | 8091 |
| Database | PostgreSQL 16 | 5432 |
| Storage | MinIO (S3) | 9000 |
| Cache | Redis | 6379 |

## Local Start

```bash
cp .env.example .env
docker compose up -d --build
```

Open:
- Frontend: http://127.0.0.1:8090
- Backend health: http://127.0.0.1:8091/api/health

## Production (HP Mini)

```
/home/donopot/dnd-saas
  .env
  docker-compose.yml
  data/
  backups/
  logs/
```

Do not reuse credentials, databases, buckets, volumes or `.env` files from the
documentary SaaS. Only shared component: host-level Caddy entrypoint.

## Caddy

- `https://dnd.dtmini.com` → DnD frontend
- `https://dnd.dtmini.com/api/*` → DnD backend
- `https://dnd.dtmini.com/ws/*` → DnD backend WebSocket

## Backend

### Métriques

| Métrique | Valeur |
|----------|--------|
| Routeurs | 11 |
| Endpoints | 83 |
| Migrations | 16 |
| Schémas Pydantic | 56 |
| Tests unitaires (pytest) | 33 |
| Smoke tests shell | 16 |
| Dép. Python | ~4100 lignes |

### Endpoints par domaine

| Domaine | Router | Endpoints |
|---------|--------|-----------|
| Auth | `auth.py` | 3 |
| Campagnes + Invitations | `campaigns.py` | 7 |
| Personnages | `characters.py` | 5 |
| Scènes + Tokens | `vtt.py` | 8 |
| Combat | `combat.py` | 11 |
| Dés + Journal | `session.py` | 9 |
| Assets + Backgrounds | `assets.py` | 4 |
| Handouts | `handouts.py` | 5 |
| Homebrew | `homebrew.py` | 9 |
| Notes MJ | `gm_notes.py` | 5 |
| Interface Joueur | `player.py` | 8 |
| **Total** | | **84** |

### Dépendances

- FastAPI, asyncpg, PyJWT, bcrypt, pydantic, slowapi, boto3

## Frontend

| Métrique | Valeur |
|----------|--------|
| Composants React | 29 |
| Modules Vite | 1763 |
| CSS | ~8885 lignes |

### Composants

| Composant | Rôle |
|-----------|------|
| `App.tsx` | Root : auth, routage rôle (GM vs Player), WebSocket |
| `PlayerView.tsx` | Dashboard joueur 6 onglets : persos, carte, dés, documents, combat, journal |
| `PlayerMap.tsx` | Carte joueur read-only : scène, tokens, fog of war, zoom |
| `InvitePage.tsx` | Page `/invite/{token}` : preview + acceptation |
| `VttBoard.tsx` | Carte interactive (scènes, tokens, assets) |
| `CombatPanel.tsx` | Gestion combat : initiative, HP, KO |
| `HandoutPanel.tsx` | Documents partagés : création, révélation |
| `SessionLogPanel.tsx` | Journal : dés, notes, catégories, épingles |
| `InitiativePanel.tsx` | Piste d'initiative légère (localStorage) |
| `CharacterPanel.tsx` | Création + liste personnages |
| `EditCharacterSheet.tsx` | Fiche éditable : stats, inventaire, sorts, attaques |
| `VisibilityInspectorPanel.tsx` | Contrôle visibilité tokens (toggle, bulk) |
| `GmNotesPanel.tsx` | Notes MJ privées |
| `HomebrewPanel.tsx` | Bibliothèque homebrew : créatures, objets, import/export |
| `AuthView.tsx` | Login/register (MJ ou Joueur, selon accountType) |
| `LandingPage.tsx` | Page d'accueil : choix MJ vs Joueur |
| `CampaignViewTabs.tsx` | Onglets campagne GM |
| `SessionWorkspace.tsx` | Layout session live (carte + combat + journal) |
| `FogLayer.tsx` | Brouillard de guerre : canvas overlay, drag-to-reveal |

### Dépendances

- React 19, Vite 8, TypeScript, lucide-react

## Phases complétées

| # | Titre | Backend | Frontend |
|---|-------|---------|----------|
| 1 | Infra (Docker, réseau isolé) | ✅ | - |
| 2 | Auth + Campagnes | ✅ | ✅ |
| 3 | Fiches personnages | ✅ | ✅ |
| 4 | Dés + Journal | ✅ | ✅ |
| 5 | WebSocket temps réel | ✅ | ✅ |
| 6 | Tokens + Scènes | ✅ | ✅ (VttBoard) |
| 7 | Combat (initiative, tours) | ✅ | ✅ (CombatPanel) |
| 8 | Assets (upload cartes) | ✅ | ✅ |
| 9 | Homebrew (créatures, objets) | ✅ | ✅ |
| 10 | Handouts (documents partagés) | ✅ | ✅ |
| 11 | Initiative Tracker | ✅ | ✅ |
| 12 | Visibilité (contrôle tokens) | ✅ | ✅ |
| 13 | Fiche éditable | ✅ | ✅ |
| 14 | Interface Joueur | ✅ | ✅ |
| 15 | Journal structuré | ✅ | ✅ |
| 16 | Fog of war | ✅ | ✅ |
| 17 | Auth GM/Joueur distinct | ✅ | ✅ |
| 18 | Interactions joueur (carte, journal, dés, import) | ✅ | ✅ |
| 19 | Communication MJ↔Joueur (jet secret, annonces, msg privés) | - | - |
| 20 | Map interactive joueur (ping, déplacement token, mesure) | - | - |
| 21 | Gestion perso par le MJ (items, XP, conditions) | - | - |
| 22 | Mesures et gabarits | - | - |
| 23 | SRD et règles de base | - | - |
| 24 | Sauvegardes et maintenance | - | - |
| 25 | Beta privée | - | - |

## Tests

```bash
# Unitaires (backend)
cd backend && uv run pytest tests/ -v

# Smoke tests (sur le serveur avec API active)
sh scripts/smoke-phase2.sh
# ... smoke-phase3.sh → smoke-phase15.sh

# Frontend
cd frontend && npx tsc --noEmit && npx vite build
```

## Documentation

- [Roadmap projet](docs/roadmap.md)
- [Règles développeur](.hermes/developer-rules.md)
- [CHANGELOG](CHANGELOG.md)
