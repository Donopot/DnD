# Backend API — Architecture et documentation technique

> Document de référence backend pour le projet DnD VTT.
> Fusionné depuis `backend-roadmap.md` et `backend-smoke-tests.md`.

---

## 1. Architecture

### Stack technique

| Composant       | Technologie                  |
|-----------------|------------------------------|
| Serveur HTTP    | FastAPI (Python)             |
| Base de données | PostgreSQL via asyncpg       |
| Stockage objets | MinIO / S3-compatible        |
| Authentification| JWT                          |
| Temps réel      | WebSocket                    |
| Conteneurisation| Docker Compose               |
| Toolchain       | uv (Python), npm (frontend)  |

### Modules existants

Le backend dispose d'un socle fonctionnel qu'il faut **renforcer, pas remplacer** :

- FastAPI avec routers organisés par domaine
- PostgreSQL avec migrations SQL appliquées au démarrage
- MinIO pour le stockage d'assets
- Authentification JWT (register, login, refresh, /auth/me)
- Gestion des campagnes et membres
- Système d'invitations
- Personnages
- Scènes VTT
- Tokens de scène (position, taille, rotation)
- Assets (upload, list, download)
- Journal / session
- WebSocket (connexion persistante par campagne)
- Rencontres / combattants / initiative (backend combat)

### Principe directeur

1. Stabiliser le backend existant (tests, smoke, CI)
2. Persister les données GM côté serveur (notes, layouts, paramètres)
3. Construire les documents révélables et la bibliothèque de tokens
4. Connecter les panneaux GM aux APIs stables
5. Reprendre l'interface joueur après stabilisation GM + backend

Toute nouvelle brique backend doit s'intégrer à l'existant — ne pas recréer de deuxième système de combat, de fichiers ou de rôles.

---

## 2. Routes / Endpoints

### Endpoints existants

```
# Authentification
POST   /api/auth/register
POST   /api/auth/login
POST   /api/auth/refresh
GET    /api/auth/me

# Campagnes
POST   /api/campaigns
GET    /api/campaigns
GET    /api/campaigns/{campaign_id}
PATCH  /api/campaigns/{campaign_id}
DELETE /api/campaigns/{campaign_id}

# Membres
GET    /api/campaigns/{campaign_id}/members
POST   /api/campaigns/{campaign_id}/members
DELETE /api/campaigns/{campaign_id}/members/{user_id}

# Invitations
POST   /api/campaigns/{campaign_id}/invitations
POST   /api/invitations/{code}/accept

# Personnages
POST   /api/campaigns/{campaign_id}/characters
GET    /api/campaigns/{campaign_id}/characters
GET    /api/characters/{character_id}
PATCH  /api/characters/{character_id}
DELETE /api/characters/{character_id}

# Scènes
POST   /api/campaigns/{campaign_id}/scenes
GET    /api/campaigns/{campaign_id}/scenes
GET    /api/scenes/{scene_id}
PATCH  /api/scenes/{scene_id}
DELETE /api/scenes/{scene_id}

# Tokens de scène
POST   /api/scenes/{scene_id}/tokens
GET    /api/scenes/{scene_id}/tokens
GET    /api/tokens/{token_id}
PATCH  /api/tokens/{token_id}
DELETE /api/tokens/{token_id}

# Assets
POST   /api/campaigns/{campaign_id}/assets
GET    /api/campaigns/{campaign_id}/assets
GET    /api/assets/{asset_id}
DELETE /api/assets/{asset_id}
GET    /api/assets/{asset_id}/download

# Rencontres / Combat
POST   /api/campaigns/{campaign_id}/encounters
GET    /api/campaigns/{campaign_id}/encounters
GET    /api/encounters/{encounter_id}
POST   /api/encounters/{encounter_id}/combatants
POST   /api/encounters/{encounter_id}/start
POST   /api/encounters/{encounter_id}/next-turn

# Santé
GET    /api/health
```

### Endpoints planifiés (roadmap)

#### BE-1 — Notes MJ persistantes

```
GET    /api/campaigns/{campaign_id}/gm-notes
POST   /api/campaigns/{campaign_id}/gm-notes
GET    /api/gm-notes/{note_id}
PATCH  /api/gm-notes/{note_id}
DELETE /api/gm-notes/{note_id}
```

#### BE-2 — Layouts GM

```
GET    /api/campaigns/{campaign_id}/gm-layouts
POST   /api/campaigns/{campaign_id}/gm-layouts
PATCH  /api/gm-layouts/{layout_id}
DELETE /api/gm-layouts/{layout_id}
```

#### BE-3 — Paramètres campagne

```
GET    /api/campaigns/{campaign_id}/settings
PATCH  /api/campaigns/{campaign_id}/settings
```

#### BE-4 — Documents révélables

```
GET    /api/campaigns/{campaign_id}/documents
POST   /api/campaigns/{campaign_id}/documents
PATCH  /api/documents/{document_id}
POST   /api/documents/{document_id}/reveal
POST   /api/documents/{document_id}/hide
GET    /api/documents/{document_id}/download
```

#### BE-5 — Bibliothèque de tokens

```
GET    /api/campaigns/{campaign_id}/token-library
POST   /api/campaigns/{campaign_id}/token-library
PATCH  /api/token-library/{item_id}
DELETE /api/token-library/{item_id}
POST   /api/token-library/{item_id}/favorite
POST   /api/token-library/{item_id}/spawn
```

---

## 3. Base de données / Migrations

### Gouvernance des migrations

Les migrations SQL sont appliquées au démarrage de l'application. Règles strictes :

- **Une migration = une intention métier**
- Nommer les migrations de façon monotone : `00X_feature_name.sql`
- Ne jamais modifier une migration déjà mergée
- Ajouter uniquement de nouvelles migrations
- Éviter les changements destructifs sans étape de transition
- Ajouter les indexes dès la création de la table si le volume futur est évident
- Utiliser JSONB pour les structures évolutives, pas pour les données relationnelles simples

Convention :

```
backend/app/migrations/00X_feature_name.sql
```

### Tables prévues par phase

| Phase | Table                     | Description                        |
|-------|---------------------------|------------------------------------|
| BE-1  | `gm_notes`                | Notes MJ par campagne/scène/token  |
| BE-2  | `gm_workspace_layouts`    | Layouts de panneaux GM             |
| BE-3  | `campaign_settings`       | Réglages centraux de campagne      |
| BE-4  | `campaign_documents`      | Documents/handouts révélables      |
| BE-4  | `campaign_document_grants`| Droits de révélation par joueur    |
| BE-4  | `campaign_document_events`| Historique des révélations         |
| BE-5  | `token_library_items`     | Tokens réutilisables en bibliothèque|
| BE-5  | `token_library_favorites` | Favoris par utilisateur            |
| BE-5  | `condition_definitions`   | Conditions normalisées (D&D 5e)    |

**Colonnes clés par table :** `gm_notes` (id, campaign_id, scene_id?, token_id?, author_user_id, title, content, visibility: gm_team|author_only, version, created/updated_at). `gm_workspace_layouts` (id, campaign_id, user_id, name, layout_key, data jsonb, is_default, version, timestamps). `campaign_settings` (campaign_id PK, dice_visibility, allow_player_token_move, show_player_hp, show_token_names, fog_enabled, game_system, extra jsonb, updated_by_user_id, updated_at).

---

## 4. WebSocket

Le backend expose une connexion WebSocket persistante par campagne pour le temps réel.

### Usages actuels

- Session / journal : logs d'événements en direct
- Combat : synchronisation initiative, tours, état des combattants
- Diffusion : mises à jour de tokens et scènes aux joueurs connectés

### Règles

- Connexion authentifiée (token JWT dans le handshake)
- Scope limité à la campagne du joueur/MJ
- Les événements de combat passent par le backend (source de vérité), pas par le client
- Ne pas recréer un canal WebSocket parallèle — étendre l'existant si nécessaire

---

## 5. Permissions

### Modèle de rôles

| Rôle   | Préfixe      | Droits                                              |
|--------|--------------|-----------------------------------------------------|
| GM     | `gm`         | CRUD complet sur campagne, scènes, tokens, combat   |
| co-GM  | `co_gm`      | CRUD complet ou limité selon visibilité des notes   |
| Joueur | `player`     | Lecture seule sauf personnage possédé ; pas d'accès aux données GM |

### Règles par domaine

#### Notes MJ (BE-1)

- **GM** : CRUD complet
- **co-GM** : CRUD complet, ou limité aux notes `gm_team` si `author_only` est restreint
- **Joueur** : aucun accès

#### Paramètres campagne (BE-3)

- **GM / co-GM** : lecture et écriture
- **Joueur** : lecture de la projection publique uniquement (si exposée)

#### Documents révélables (BE-4)

- **GM / co-GM** : CRUD, révéler, cacher, download
- **Joueur** : lecture et download uniquement si document révélé à lui ou à tous

### Implémentation

- Décorateur / dépendance FastAPI vérifiant le rôle campagne
- Toute route touchant une ressource campagne doit valider l'appartenance du user à cette campagne
- Les erreurs HTTP standardisées : 401 (non authentifié), 403 (non autorisé), 404 (ressource inexistante ou non accessible)

---

## 6. Testing / Smoke

### BE-0 — Stabilisation backend

Phase initiale de vérification du backend avant toute nouvelle brique métier. Aucune nouvelle fonctionnalité — uniquement des tests de bout en bout.

### Script smoke

Fichier : `scripts/smoke-backend.sh`

**Parcours testé (14 étapes) :**

1. Health check (`/api/health`)
2. Register utilisateur GM
3. Login
4. Auth/me (vérification token)
5. Création campagne
6. Liste campagnes
7. Création personnage
8. Création scène
9. Création token sur scène
10. Mise à jour token (position)
11. Création rencontre
12. Création combattant dans la rencontre
13. Démarrage rencontre (`start`)
14. Tour suivant (`next-turn`)

### Utilisation

```bash
# Variables d'environnement configurables
API_URL=http://127.0.0.1:8091
DND_SMOKE_PASSWORD=SmokePass123!
DND_SMOKE_EMAIL=smoke+manual@dnd-smoke.fr

# Lancement
API_URL=http://127.0.0.1:8091 sh scripts/smoke-backend.sh
```

### Résultat attendu

Le script doit terminer par :

```
smoke-backend-ok
```

Code de sortie 0.

### Validation CI

Chaque sprint backend doit passer :

```bash
# Compilation Python
python -m compileall backend/app

# Tests unitaires (si pytest disponible)
pytest -q || true

# Build et démarrage Docker
docker compose up -d --build

# Attente API prête
sh scripts/wait-api.sh

# Health check
curl -fsS http://127.0.0.1:8091/api/health

# Smoke test complet
sh scripts/smoke-backend.sh
```

### Critères d'acceptation BE-0

- Backend démarre dans Docker sans erreur
- `/api/health` retourne `database: ok` et `object_storage: ok`
- Smoke script retourne 0
- Aucune régression sur le build frontend
- Migrations appliquées correctement sur base fraîche

---

## 7. Règles de développement

### Règles par brique backend

Chaque nouvelle fonctionnalité backend doit respecter :

1. **Migration SQL dédiée** — une intention métier, nommée de façon monotone
2. **Schemas Pydantic dédiés** — validation des entrées/sorties
3. **Router FastAPI dédié** si le domaine est nouveau
4. **Permissions basées sur les rôles campagne** existants (GM, co-GM, joueur)
5. **Tests ou scripts smoke** — valider le cycle complet
6. **Documentation** dans `docs/`
7. **Commit clair** — message explicite, atomique
8. **Validation Docker** — build + health + smoke

### Règles BE-0 spécifiques

- Ne pas ajouter de nouveau domaine métier
- Ne pas modifier les migrations existantes
- Ne pas remplacer les routers existants
- Ne pas modifier le frontend
- Ajouter uniquement les vérifications nécessaires
- Toute future brique backend devra passer ce smoke test

### Feature flags

Les nouvelles fonctions backend doivent pouvoir être activées progressivement :

```
backend_gm_notes_enabled
backend_gm_layouts_enabled
campaign_settings_enabled
document_reveal_enabled
token_library_enabled
```

- Version simple au départ : variables d'environnement
- Version cible : table `feature_flags` ou settings campagne

Règle frontend associée :
- Si API disponible et flag actif → utiliser le backend
- Si API indisponible → fallback localStorage temporaire
- Afficher clairement les données locales non synchronisées

### Définition de fini (Definition of Done)

Une phase backend est terminée seulement si :

- [x] Migrations OK sur base fraîche
- [x] Application démarre sans erreur
- [x] Health endpoint OK
- [x] Smoke tests OK
- [x] Endpoints documentés
- [x] Permissions testées
- [x] Frontend compatible
- [x] Documentation mise à jour
- [x] Commit + push effectués

### Workflow développeur

À chaque nouvelle étape :

1. Lire l'état Git (`git status`, `git log`)
2. Créer une branche dédiée (`agent/backend/...` ou `feature/be-X-...`)
3. Modifier migration → schema → router → service
4. Ajouter ou mettre à jour les scripts de test
5. Lancer la validation (compileall, pytest, Docker, smoke)
6. Documenter dans `docs/`
7. Commit atomique avec message explicite
8. Indiquer clairement la prochaine étape

### Séquence recommandée

```
BE-0 → BE-1 → BE-2 → BE-3 → BE-4 → BE-5
(stabilisation → notes → layouts → settings → documents → token library)
```

Frontend repris après chaque phase : BE-1 (Notes MJ serveur), BE-2 (sauvegarde layout), BE-3 (onglet Paramètres), BE-4 (panneau Documents révélables), BE-5 (bibliothèque tokens + spawn).

---

## Références

- `docs/backend-roadmap.md` — Roadmap complète
- `docs/backend-smoke-tests.md` — Détail BE-0
- `scripts/smoke-backend.sh` / `scripts/wait-api.sh`
- `AGENTS.md`, `docs/deployment-ops.md`
