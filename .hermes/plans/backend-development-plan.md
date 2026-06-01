# Plan de développement Backend DnD VTT — Roadmap Phases 9 à 15

> **Pour Hermes :** Ce plan couvre l'intégralité du backend restant selon la roadmap produit.
> Chaque phase est auto-porteuse (migration → endpoints → smoke test → documentation).

**Objectif :** Compléter le backend VTT DnD de la Phase 8 (back-end terminé) à la Phase 15, en respectant les conventions existantes (FastAPI, asyncpg, Pydantic v2, MinIO/boto3, WebSocket broadcast).

**Architecture existante :** FastAPI avec 8 routeurs, PostgreSQL, MinIO, Redis, WebSocket temps réel, migrations idempotentes via `schema_migrations`, permissions basées sur rôles (`gm`, `co_gm`, `player`).

**Conventions à respecter :**
- Migration dédiée dans `backend/app/migrations/`
- Router dédié dans `backend/app/routers/`  
- Schémas Pydantic dans `backend/app/schemas.py`
- Smoke test `scripts/smoke-phase{N}.sh`
- Documentation dans `docs/phase-{N}-*.md`

---

## Phase 9 — UX carte avancée (Backend)

**Statut roadmap :** En attente du backend
**Version cible :** v0.9.0

### BE-9A — Endpoints de mise à jour token affinés

**Objectif :** Permettre les déplacements Drag & Drop fluides des tokens.

**Migration :** `008_phase9_token_ux.sql`
- Ajouter colonne `snap_to_grid boolean not null default true` dans `campaign_scenes`
- Index sur `scene_tokens(updated_at)` pour les events temps réel

**Schémas Pydantic :**
- `TokenMoveRequest` : `{x: int, y: int}` (léger, pour les updates fréquents)
- `SceneSettingsUpdateRequest` : `{snap_to_grid: bool | None, grid_size: int | None, ...}`

**Endpoints :**
| Méthode | Route | Description |
|---------|-------|-------------|
| `PATCH` | `/api/tokens/{token_id}/move` | Déplacement rapide (x, y uniquement) — évite la lourdeur du PATCH complet |
| `PATCH` | `/api/scenes/{scene_id}/settings` | Mise à jour `snap_to_grid`, `grid_size` |

**Event temps réel :**
- Nouvel event `token_moved` broadcasté (plus léger que `session_changed`)
- Payload : `{type: "token_moved", token_id, x, y, scene_id}`

**Permissions :** `gm`, `co_gm`, `player` (pour leur propres tokens)

**Smoke test :** `scripts/smoke-phase9.sh`
- Déplacer un token via PATCH move
- Vérifier positions
- Activer/désactiver snap_to_grid
- Vérifier broadcast token_moved via WebSocket

**Fichiers à créer/modifier :**
- `backend/app/migrations/008_phase9_token_ux.sql`
- `backend/app/routers/vtt.py` — ajouter les 2 nouveaux endpoints
- `backend/app/schemas.py` — `TokenMoveRequest`, `SceneSettingsUpdateRequest`
- `backend/app/realtime.py` — méthode `broadcast_token_move()`
- `scripts/smoke-phase9.sh`

---

## Phase 10 — Handouts, notes et documents de campagne

**Statut roadmap :** À faire
**Version cible :** v0.10.0

### BE-10A — Table et CRUD handouts

**Objectif :** Permettre au MJ de créer des documents partageables avec les joueurs.

**Migration :** `009_phase10_handouts.sql`
- Table `handouts` :
  - `id uuid PK`, `campaign_id uuid FK`, `author_user_id uuid FK`
  - `title text`, `content text`
  - `visibility text` check `('public', 'players', 'gm', 'gm_team')`
  - `asset_id uuid FK → campaign_assets` (optionnel, pour lien MinIO)
  - `scene_id uuid FK` (optionnel)
  - `is_revealed boolean default false`
  - `revealed_at timestamptz`
  - `created_at`, `updated_at`
- Index : `campaign_id`, `author_user_id`, `visibility`

**Schémas Pydantic :**
- `HandoutCreateRequest` : `{title, content, visibility, asset_id?, scene_id?}`
- `HandoutUpdateRequest` : tous optionnels + `is_revealed: bool`
- `HandoutPublic` : complet

**Endpoints :**
| Méthode | Route | Description |
|---------|-------|-------------|
| `GET` | `/api/campaigns/{id}/handouts` | Liste filtrée par rôle (GM voit tout, player voit `public` + `players` révélés) |
| `POST` | `/api/campaigns/{id}/handouts` | Créer un handout (GM/co-GM) |
| `GET` | `/api/handouts/{id}` | Détail |
| `PATCH` | `/api/handouts/{id}` | Modifier/révéler |
| `DELETE` | `/api/handouts/{id}` | Supprimer (GM/co-GM) |

**Permissions :**
- `gm`, `co_gm` : tout voir, créer, modifier, supprimer
- `player` : voir uniquement `public` et `players` avec `is_revealed = true`

**Event temps réel :**
- Broadcast `session_changed` avec `resource: "handout"` lors de reveal

**Smoke test :** `scripts/smoke-phase10.sh`
- Créer handout public, players, gm
- Vérifier visibilité joueur (ne voit pas gm, voit public)
- Révéler un handout players
- Vérifier visibilité après révélation

**Fichiers :**
- `backend/app/migrations/009_phase10_handouts.sql`
- `backend/app/routers/handouts.py`
- `backend/app/schemas.py` — schémas handouts
- `backend/app/main.py` — inclure le nouveau router
- `scripts/smoke-phase10.sh`
- `docs/phase-10-handouts.md`

---

## Phase 11 — Conditions et états de combat

**Statut roadmap :** À faire
**Version cible :** v0.11.0

### BE-11A — Conditions structurées backend

**Objectif :** Remplacer le simple `list[str]` de conditions par des objets structurés avec durée, source et concentration.

**Note :** Les conditions existent déjà en JSONB dans `combatants`. Cette phase les structure sans casser l'existant.

**Migration :** `010_phase11_conditions.sql`
- Ajouter colonne `conditions_v2 jsonb default '[]'` dans `combatants` (coexiste avec `conditions`)
- Table `combat_log` :
  - `id uuid PK`, `encounter_id uuid FK`, `campaign_id uuid FK`
  - `combatant_id uuid FK`, `actor_user_id uuid FK`
  - `event_type text` (`condition_applied`, `condition_removed`, `damage`, `heal`, `defeated`, `revived`)
  - `payload jsonb`, `created_at timestamptz`
- Index : `encounter_id`, `campaign_id`, `created_at`

**Schémas Pydantic :**
- `ConditionDetail` : `{name: str, duration: int | None, duration_unit: str | None ("rounds"/"minutes"), source: str | None, is_concentration: bool}`
- `ApplyConditionRequest` : `{combatant_id: UUID, condition: ConditionDetail}`
- `RemoveConditionRequest` : `{combatant_id: UUID, condition_name: str}`
- `CombatLogEntryPublic` : complet

**Endpoints :**
| Méthode | Route | Description |
|---------|-------|-------------|
| `POST` | `/api/encounters/{id}/conditions/apply` | Appliquer une condition à un combattant |
| `POST` | `/api/encounters/{id}/conditions/remove` | Retirer une condition |
| `GET` | `/api/encounters/{id}/log` | Journal de combat |

**Journalisation automatique :**
- Chaque apply/remove écrit dans `combat_log`
- Les updates de HP via `PATCH /combatants` journalisent aussi

**Event temps réel :**
- Broadcast `session_changed` avec `resource: "combat_log"` et `resource: "condition"`

**Smoke test :** `scripts/smoke-phase11.sh`
- Appliquer "prone" à un combattant
- Vérifier conditions_v2
- Appliquer "concentration" avec durée 10 rounds
- Retirer une condition
- Vérifier le combat_log

**Fichiers :**
- `backend/app/migrations/010_phase11_conditions.sql`
- `backend/app/routers/combat.py` — ajouter les 3 endpoints
- `backend/app/schemas.py` — nouveaux schémas
- `scripts/smoke-phase11.sh`
- `docs/phase-11-conditions.md`

---

## Phase 12 — Initiative et automatisation légère

**Statut roadmap :** À faire
**Version cible :** v0.12.0

### BE-12A — Initiative automatisée

**Objectif :** Permettre de lancer l'initiative automatiquement depuis les tokens d'une scène.

**Migration :** Aucune nouvelle table nécessaire (utilise `combatants.initiative`)

**Schémas Pydantic :**
- `BulkInitiativeRequest` : `{token_ids: list[UUID] | None, add_all_scene_tokens: bool}` (si token_ids=None et add_all_scene_tokens=True → tous les tokens de la scène)
- `InitiativeResult` : `{combatant_id: UUID, name: str, roll: int, total: int}`
- `RerollInitiativeRequest` : `{combatant_ids: list[UUID] | None}` (None = tous)

**Endpoints :**
| Méthode | Route | Description |
|---------|-------|-------------|
| `POST` | `/api/encounters/{id}/roll-initiative` | Lancer initiative pour des tokens/combattants |
| `POST` | `/api/encounters/{id}/reroll-initiative` | Relancer initiative |
| `POST` | `/api/scenes/{scene_id}/encounters/from-scene` | Créer un encounter avec tous les tokens de la scène comme combattants |

**Logique `from-scene` :**
1. Créer l'encounter rattaché à la scène
2. Pour chaque token de la scène, créer un combattant lié
3. Si le token a un `character_id`, pré-remplir les stats (AC, HP, initiative mod via DEX)
4. Initiative = d20 + modificateur DEX (si dispo)

**Logique `roll-initiative` :**
1. Pour chaque combattant, `d20 + modificateur` (ou 0 si pas de perso)
2. Mettre à jour `combatants.initiative`
3. Trier et réordonner l'encounter

**Smoke test :** `scripts/smoke-phase12.sh`
- Créer une scène avec 3 tokens
- Créer un encounter from-scene
- Vérifier 3 combattants créés
- Lancer initiative
- Vérifier ordre décroissant
- Relancer
- Vérifier broadcast

**Fichiers :**
- `backend/app/routers/combat.py` — ajouter les endpoints
- `backend/app/schemas.py` — nouveaux schémas
- `scripts/smoke-phase12.sh`
- `docs/phase-12-initiative.md`

---

## Phase 13 — Bibliothèque homebrew minimale

**Statut roadmap :** À faire
**Version cible :** v0.13.0

### BE-13A — Creatures et items réutilisables

**Objectif :** Stocker monstres, PNJ et objets récurrents par campagne.

**Migration :** `011_phase13_homebrew.sql`
- Table `homebrew_creatures` :
  - `id uuid PK`, `campaign_id uuid FK`
  - `name text`, `description text`
  - `armor_class int`, `hp_max int`, `speed int`
  - `attributes jsonb` (STR/DEX/CON/INT/WIS/CHA), `attacks jsonb`, `spells jsonb`
  - `size text` (`tiny`/`small`/`medium`/`large`/`huge`/`gargantuan`)
  - `challenge_rating float`
  - `type text` (`monster`, `npc`, `beast`, `humanoid`, etc.)
  - `created_at`, `updated_at`
- Table `homebrew_items` :
  - `id uuid PK`, `campaign_id uuid FK`
  - `name text`, `description text`, `item_type text`
  - `rarity text` (`common`/`uncommon`/`rare`/`very_rare`/`legendary`)
  - `properties jsonb`
  - `created_at`, `updated_at`

**Schémas Pydantic :**
- `HomebrewCreatureCreate/Update/Public`
- `HomebrewItemCreate/Update/Public`
- `CreatureToTokenRequest` : `{scene_id: UUID, x?: int, y?: int}`
- `CreatureToCombatantRequest` : `{encounter_id: UUID, initiative?: int}`

**Endpoints :**
| Méthode | Route | Description |
|---------|-------|-------------|
| `GET` | `/api/campaigns/{id}/homebrew/creatures` | Liste creatures |
| `POST` | `/api/campaigns/{id}/homebrew/creatures` | Créer creature |
| `GET` | `/api/homebrew/creatures/{id}` | Détail |
| `PATCH` | `/api/homebrew/creatures/{id}` | Modifier |
| `DELETE` | `/api/homebrew/creatures/{id}` | Supprimer |
| `POST` | `/api/homebrew/creatures/{id}/to-token` | Créer un token depuis la creature |
| `POST` | `/api/homebrew/creatures/{id}/to-combatant` | Créer un combattant depuis la creature |
| `GET/POST/PATCH/DELETE` | `/api/campaigns/{id}/homebrew/items` | CRUD items |
| `GET` | `/api/campaigns/{id}/homebrew/export` | Export JSON de toutes les créatures + items de la campagne |
| `POST` | `/api/campaigns/{id}/homebrew/import` | Import JSON |

**Permissions :** `gm`, `co_gm` pour CRUD, `player` pour lecture

**Smoke test :** `scripts/smoke-phase13.sh`
- Créer une creature (gobelin)
- Créer un item (potion de soin)
- Créer un token depuis la creature
- Créer un combattant depuis la creature
- Export JSON
- Import JSON
- Vérifier intégrité

**Fichiers :**
- `backend/app/migrations/011_phase13_homebrew.sql`
- `backend/app/routers/homebrew.py`
- `backend/app/schemas.py` — schémas homebrew
- `backend/app/main.py` — inclure le router
- `scripts/smoke-phase13.sh`
- `docs/phase-13-homebrew.md`

---

## Phase 14 — Accès joueur et expérience session

**Statut roadmap :** À faire
**Version cible :** v0.14.0

### BE-14A — Endpoints joueur sécurisés et audit

**Objectif :** Restreindre strictement ce qu'un joueur peut voir/modifier, et auditer les permissions.

**Migration :** `012_phase14_player_access.sql`
- Table `permission_audit` (optionnelle, pour log) :
  - `id uuid PK`, `campaign_id uuid FK`, `user_id uuid FK`
  - `resource_type text`, `resource_id uuid`, `action text`
  - `granted boolean`, `role text`, `created_at timestamptz`

**Nouveaux endpoints joueur :**
| Méthode | Route | Description |
|---------|-------|-------------|
| `GET` | `/api/campaigns/{id}/player/summary` | Résumé campagne (nom, description, membres, scènes actives) |
| `GET` | `/api/campaigns/{id}/player/characters` | Personnages du joueur uniquement |
| `GET` | `/api/campaigns/{id}/player/scenes` | Scènes de la campagne (métadonnées) |
| `GET` | `/api/campaigns/{id}/player/handouts` | Handouts visibles joueurs |
| `GET` | `/api/player/scenes/{id}/tokens` | Tokens visibles de la scène |
| `GET` | `/api/player/encounters/{id}` | État du combat (combattants non cachés) |

**Renforcement des routers existants :**
- `campaigns.py` : GET `/campaigns/{id}/members` → masquer les rôles si `player` ?
- `vtt.py` : GET `/scenes/{id}/tokens` → déjà filtré `is_hidden` pour `player` ✓
- `session.py` : GET `/campaigns/{id}/log` → déjà filtré `visibility` ✓
- `combat.py` : GET `/encounters/{id}` → déjà filtré `is_hidden` pour `player` ✓

**Middleware optionnel d'audit :**
- Dépendance `audit_access(campaign_id, user_id, resource, action)` → log dans `permission_audit` si configuré
- Désactivable via `BACKEND_AUDIT_ENABLED=false`

**Smoke test :** `scripts/smoke-phase14.sh`
- Créer GM + player
- Vérifier que player voit ses persos
- Vérifier que player ne voit pas les persos des autres
- Vérifier que player ne voit pas les handouts `gm`
- Vérifier que player ne voit pas les tokens cachés
- Vérifier que player ne peut pas créer de scène
- Vérifier l'audit log

**Fichiers :**
- `backend/app/migrations/012_phase14_player_access.sql`
- `backend/app/routers/player.py` — router joueur dédié
- `backend/app/deps.py` — ajouter `audit_access()` si activé
- `backend/app/config.py` — `backend_audit_enabled: bool`
- `backend/app/main.py` — inclure le router player
- `scripts/smoke-phase14.sh`
- `docs/phase-14-player-access.md`

---

## Phase 15 — Journal de campagne structuré

**Statut roadmap :** À faire
**Version cible :** v0.15.0

### BE-15A — Catégories, liens et export du journal

**Objectif :** Transformer le journal plat en historique structuré avec catégories, liens et export.

**Migration :** `013_phase15_journal.sql`
- Ajouter à `game_log_entries` :
  - `category text default 'general'` → `('general', 'combat', 'rp', 'exploration', 'gm_note')`
  - `linked_scene_id uuid FK` (optionnel)
  - `linked_encounter_id uuid FK` (optionnel)
  - `linked_character_id uuid FK` (optionnel)
  - `pinned boolean default false`
  - `session_marker boolean default false` (pour délimiter les sessions)
  - Index : `campaign_id, category`, `campaign_id, pinned`, `campaign_id, created_at desc`

**Schémas Pydantic :**
- `GameLogEntryPublic` — ajouter les nouveaux champs
- `SessionSummary` : `{started_at, ended_at, note_count, roll_count, combat_events, characters_present, highlights: list[str]}`
- `LogExportRequest` : `{format: "markdown"|"json", category?: str, from_date?: datetime, to_date?: datetime}`

**Endpoints :**
| Méthode | Route | Description |
|---------|-------|-------------|
| `GET` | `/api/campaigns/{id}/log` | Journal avec filtres `?category=X&linked_scene=X&pinned=true` |
| `POST` | `/api/campaigns/{id}/log/session-marker` | Marquer début/fin de session |
| `GET` | `/api/campaigns/{id}/log/export` | Export markdown/JSON |
| `GET` | `/api/campaigns/{id}/log/sessions` | Liste des sessions (basée sur markers) |
| `GET` | `/api/campaigns/{id}/log/sessions/{session_id}` | Résumé d'une session |
| `PATCH` | `/api/log-entries/{id}/pin` | Épingler/désépingler une entrée |
| `PATCH` | `/api/log-entries/{id}/category` | Changer la catégorie |

**Export markdown :**
```markdown
# Journal de campagne — [Nom]
## Session du 2026-06-01

### Combat — Round 1
- **Gobelin** attaque **Aldric** : 17 touche, 6 dégâts

### RP
- Aldric négocie avec le chef gobelin...
```

**Smoke test :** `scripts/smoke-phase15.sh`
- Créer entrées avec différentes catégories
- Marquer une session
- Lister les sessions
- Récupérer le résumé d'une session
- Exporter en markdown
- Épingler/désépingler
- Vérifier les liens scène/combat/personnage

**Fichiers :**
- `backend/app/migrations/013_phase15_journal.sql`
- `backend/app/routers/session.py` — enrichir
- `backend/app/schemas.py` — enrichir GameLogEntryPublic
- `scripts/smoke-phase15.sh`
- `docs/phase-15-journal.md`

---

## Vue d'ensemble et ordre d'exécution

```
Phase 9  → BE-9A  (token move, snap_to_grid, token_moved event)
Phase 10 → BE-10A (handouts table, CRUD, permissions, reveal)
Phase 11 → BE-11A (conditions structurées, combat_log, apply/remove)
Phase 12 → BE-12A (roll initiative, from-scene, reroll)
Phase 13 → BE-13A (homebrew creatures/items, import/export, to-token/combatant)
Phase 14 → BE-14A (player router, audit, permission hardening)
Phase 15 → BE-15A (journal categories, links, export, session markers)
```

**Chaque phase produit :**
1. Une migration SQL idempotente
2. Des schémas Pydantic dans `schemas.py`
3. Un routeur (ou enrichissement d'un routeur existant)
4. Un smoke test shell
5. Une documentation markdown

**Après chaque phase :**
- `python -m compileall backend/app`
- `docker compose up -d --build`
- `sh scripts/wait-api.sh`
- Tous les smoke tests précédents + le nouveau
