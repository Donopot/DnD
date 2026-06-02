# DnD SaaS — Virtual Tabletop

Virtual Tabletop Donjons & Dragons en navigateur, conçu pour fonctionner sur HP Mini.

**Statut** : Beta privée — 33/33 phases complétées 🎉

## Architecture

| Composant | Technologie | Port interne |
|-----------|------------|-------------|
| Frontend | React 19 + Vite | 8090 |
| Backend | FastAPI (Python 3.12) | 8091 |
| Database | PostgreSQL 16 | 5432 |
| Storage | MinIO (S3) | 9000 |
| Cache | Redis | 6379 |

## Démarrage rapide

```bash
cp .env.example .env
docker compose up -d --build
```

- Frontend : http://127.0.0.1:8090
- Backend health : http://127.0.0.1:8091/api/health

## Production (HP Mini)

```
/home/donopot/dnd-saas
  .env
  docker-compose.yml
  data/
  backups/
  logs/
```

Ne pas réutiliser les credentials, bases de données, buckets, volumes ou `.env` de l'autre SaaS. Seul composant partagé : Caddy (entrypoint hôte).

## Caddy

- `https://dnd.dtmini.com` → Frontend
- `https://dnd.dtmini.com/api/*` → Backend
- `https://dnd.dtmini.com/ws/*` → WebSocket

## Fonctionnalités

### Backend (102 endpoints, 13 routeurs, 19 migrations, 49 tests unitaires)

| Domaine | Endpoints |
|---------|-----------|
| Auth | register, login, me |
| Campagnes | create, list, join via invite code, members, invites |
| Personnages | CRUD, vault personnel, soumission MJ, XP, HP, conditions, inventaire, ressources |
| Dés | lancer (normal/avantage/désavantage), journal des lancers |
| Scènes & Tokens | CRUD scènes, CRUD tokens, déplacement, visibilité, fog of war |
| Combat | créer/activer/tour, gestion de l'initiative, combattants |
| Assets | upload/download cartes et tokens, gestion fichiers |
| Handouts | documents partagés MJ↔Joueurs |
| Homebrew | créatures, objets, sorts personnalisés |
| Session | jets, journal structuré, marqueurs, export markdown/JSON |
| Communication | messages privés, annonces, jets secrets MJ |
| Santé | health check (DB + S3), rate limiting 200/min |

### Frontend (43 composants React, ~11 800 lignes CSS, 1765 modules Vite)

| Composant | Rôle |
|-----------|------|
| AuthPage | Login/register avec force mot de passe, honeypot anti-bot |
| PlayerLobby | Hall joueur (créer perso, rejoindre campagne) |
| GmLobby | Hall MJ (créer campagne, gérer persos) |
| CampaignMap | Carte partagée (zoom, pan, fog of war, tokens, AoE) |
| MapTools | Ping, règle de distance, gabarits AoE (cône/sphère/cube/ligne), drag token |
| GmCharacterInspector | Modal MJ : PV, XP, conditions, inventaire, ressources |
| PlayerView | Interface joueur (carte + persos + dés + handouts + combat + journal) |
| GmMessagePanel | Communication MJ (messages privés, annonces, jets secrets) |
| PlayerNotifications | Cloche 🔔 notifications temps réel + polling 30s |
| EditCharacterSheet | Édition fiche de personnage |
| SessionLogPanel | Journal de session structuré |
| HomebrewPanel | Gestion créatures/objets/sorts custom |
| HandoutPanel | Gestion documents partagés |
| RulesReference | SRD D&D 5e consultable (conditions, combat, XP, règles) |
| CombatTracker | Tracker de combat visuel (initiative, HP, conditions, tours) |
| DiceRoller | Dés visuels animés (d4-d20, Nat 20 glow, avantage/désavantage) |
| EncounterBuilder | Générateur de rencontres (CR calculator, random par biome) |
| QuickActions | Macros et barre d'actions rapides personnalisables |
| SessionStats | Statistiques de session (jets, Nat 20, moyennes) |
| FogLayer | Brouillard de guerre |
| PersonalCharactersSection | Vault personnages (création, soumission) |
| InvitePage | Page invitation avec preview |
| MessageDock | Toast notifications |

### Temps réel (WebSocket)

- Présence (connexion/déconnexion joueurs)
- Changements scène/tokens/handouts/combat (broadcast)
- Ping carte (clic → animation 2.5s)
- Règle mesure distance
- Drag tokens joueurs (validation propriétaire)
- Gabarits AoE (cône, sphère, cube, ligne)

### Layouts

- **AuthPage** : authentification standalone
- **PlayerLobby** : joueur sans campagne active
- **GmLobby** : MJ sans campagne active
- **GM Campaign** : layout 3 colonnes (sidebar 210px | carte | panneaux 320px)
- **Player Campaign** : carte à gauche + panneaux à droite

### Maintenance

- `scripts/backup-db.sh` : backup PostgreSQL quotidien (pg_dump + gzip, rétention 30j)
- Cron job 03h00 : backup automatique
- Cron job 06h00 : audit code quotidien
- Cron job 07h30 : suggestions d'amélioration

## Développement

```bash
# Backend
cd backend
uv run uvicorn app.main:app --reload --port 8091

# Frontend
cd frontend
npx vite --port 8090

# Tests
cd backend && uv run pytest tests/ -v
cd frontend && npx tsc --noEmit && npx vite build
```

## Sécurité

- JWT (access token 7 jours)
- Rate limiting global 200 req/min (slowapi)
- Honeypot anti-bot au register
- Complexité mot de passe (minuscule, majuscule, chiffre, 8+ caractères)
- Rôles : gm, co_gm, player — authorization par endpoint
- Cors restrictif (settings.cors_origins)
- Environnements isolés (jamais partager credentials entre SaaS)
