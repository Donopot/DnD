# DnD SaaS — Virtual Tabletop auto-hébergé

VTT Donjons & Dragons en navigateur, conçu pour tourner sur un HP Mini et servir une vraie table de jeu.

Le projet vise une expérience MJ rapide, claire et fiable : préparer une campagne, lancer une session, gérer scènes, cartes, tokens, combats, notes et secrets, tout en séparant strictement la vue MJ et la vue joueur.

## Statut

Beta privée active.

Le socle est fonctionnel : authentification, campagnes, personnages, scènes, tokens, assets, WebSocket, combat, journal de session, handouts, bibliothèque SRD, panneaux MJ et carte VTT.

Chantiers prioritaires en cours :

- alléger `App.tsx` par extraction progressive ;
- stabiliser les interactions carte/tokens/fog ;
- renforcer l'interface joueur ;
- réduire la dette CSS et clavier ;
- garder la documentation consolidée.

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

Principe central : **le backend est la source de vérité**. Les permissions, les données persistantes et les validations critiques doivent rester côté backend.

## Démarrage rapide

```bash
cp .env.example .env
# remplir les secrets dans .env

docker compose up -d --build
```

Accès local :

```txt
Frontend : http://127.0.0.1:8090
Backend health : http://127.0.0.1:8091/api/health
```

Vérification :

```bash
curl -i http://127.0.0.1:8091/api/health
docker compose ps
```

## Production HP Mini

Chemin cible :

```txt
/home/donopot/dnd-saas
```

Services attendus :

| Service | Rôle | Port |
|---|---|---|
| `dnd-frontend` | SPA React via Nginx | 127.0.0.1:8090 |
| `dnd-backend` | API FastAPI + WS | 127.0.0.1:8091 |
| `dnd-postgres` | Base PostgreSQL | interne |
| `dnd-redis` | Cache | interne |
| `dnd-minio` | Stockage assets | interne |

Caddy expose :

```txt
https://dnd.dtmini.com        → frontend
https://dnd.dtmini.com/api/*  → backend
https://dnd.dtmini.com/ws/*   → WebSocket
```

Ne jamais partager les secrets, volumes, buckets ou bases de données avec un autre SaaS. Le seul composant partagé côté hôte doit rester le reverse proxy.

## Fonctionnalités principales

### Maître du Jeu

- Lobby MJ et création de campagne.
- Gestion des membres et invitations.
- Carte VTT avec zoom, pan, grille, tokens, fog, mini-map et mode focus.
- Panneaux dockés et flottants.
- Combat, initiative, rencontres, conditions et actions rapides.
- Notes MJ, messages, handouts et journal de session.
- Bibliothèque : bestiaire, sorts, objets, règles SRD, tokens, homebrew.

### Joueur

- Lobby joueur.
- Personnages et fiche compacte.
- Vue joueur séparée.
- Carte avec visibilité filtrée.
- Dés, journal public, handouts et état de combat.

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

Le fog représente des zones révélées. Le canvas dessine un overlay sombre puis découpe les zones `rect` ou `circle`.

## Développement

Backend :

```bash
cd backend
uv sync
uv run uvicorn app.main:app --reload --port 8091
```

Frontend :

```bash
cd frontend
npm ci
npx vite --port 8090
```

Tests et validation :

```bash
cd backend && uv run pytest tests/ -v
cd frontend && npx tsc --noEmit && npx vite build
```

Déploiement local complet :

```bash
docker compose up -d --build
docker compose logs --tail=200 -f
```

## Documentation

La documentation active est dans [`docs/`](docs/README.md).

| Besoin | Document |
|---|---|
| Vision produit | [`docs/product-roadmap.md`](docs/product-roadmap.md) |
| Architecture | [`docs/02-architecture.md`](docs/02-architecture.md) |
| Interface et panneaux | [`docs/frontend-ui.md`](docs/frontend-ui.md) |
| Carte, tokens, fog | [`docs/vtt-map-fog.md`](docs/vtt-map-fog.md) |
| Backend et API | [`docs/backend-api.md`](docs/backend-api.md) |
| Sécurité et auth | [`docs/security-auth.md`](docs/security-auth.md) |
| Déploiement | [`docs/deployment-ops.md`](docs/deployment-ops.md) |
| Contenu SRD | [`docs/srd-content.md`](docs/srd-content.md) |

Règle de maintenance : éviter de créer des documents concurrents. Les docs permanentes doivent être intégrées dans les documents principaux. Les plans de PR temporaires vont dans `docs/work-in-progress/`, puis en archive ou dans une doc permanente après merge.

## Sécurité

- JWT via `Authorization: Bearer`.
- Mots de passe hashés avec bcrypt.
- Rate limiting sur l'authentification.
- CORS configuré par environnement.
- Rôles campagne : `gm`, `co_gm`, `player`.
- Permissions critiques vérifiées côté backend.
- `.env` exclu du repo.
- Stockage MinIO isolé par projet.

## Maintenance serveur

Suivre les logs :

```bash
docker compose logs --tail=200 -f
```

Backend seulement :

```bash
docker compose logs --tail=200 -f dnd-backend
```

Arrêter uniquement le projet DnD :

```bash
docker compose stop
```

Redémarrer :

```bash
docker compose up -d
```

Ne pas utiliser `docker compose down -v` sauf volonté explicite de supprimer les volumes.

## Structure du repo

```txt
backend/   API FastAPI, routers, migrations, tests
frontend/  React/Vite, composants, hooks, styles
docs/      Documentation produit, technique et opérations
scripts/   Scripts de maintenance et vérification
```

## Priorités techniques actuelles

- Réduire le monolithe `App.tsx`.
- Extraire les responsabilités en hooks et workspaces.
- Unifier les raccourcis clavier.
- Versionner les données `localStorage`.
- Renforcer `AbortController` sur les fetchs lourds.
- Découper les CSS volumineux par domaine.
- Garder les requêtes backend paramétrées et auditées.
