# Refonte Interfaces MJ/Joueur + Personnages Hors Campagne — Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** 
1. Permettre aux joueurs et MJ de créer des personnages **hors campagne** (vault personnel)
2. Permettre aux joueurs de **soumettre** leurs personnages au MJ pour une campagne
3. Refondre les interfaces pour que MJ et Joueur **ne voient jamais les mêmes choses** en campagne, sauf la carte partagée

**Architecture:**
- `CampaignMap` : composant central partagé par les deux rôles (grille, fond, tokens, zoom, pan, fog)
- Characters table : `campaign_id` devient nullable + `status` (personal/submitted/active/archived)
- Endpoints de soumission : `POST /submit`, `GET /submissions`, `PATCH /approve`
- GM : sidebar compacte + map centrale + panneaux outils à droite (dont Soumissions)
- Player : map à gauche + panneaux joueur à droite (dont perso vault + soumettre)

**Tech Stack:** React 19, TypeScript, FastAPI, PostgreSQL, CSS Grid

**Conventions:** Voir `.hermes/developer-rules.md` — branches `feat/`, migrations `NNN_phaseN_desc.sql`, smoke tests Python.

---

## 🔍 Audit de l'existant

### Base de données — Characters

```sql
-- Actuel (migration 002)
campaign_id uuid NOT NULL  -- 🔴 obligatoire
owner_user_id uuid         -- ✅ existe
-- PAS de status, PAS de submitted_to_campaign_id

-- Nécessaire
campaign_id uuid NULL              -- 🆕 nullable (NULL = vault personnel)
owner_user_id uuid NOT NULL        -- 🔧 rendre NOT NULL
status text NOT NULL DEFAULT ...   -- 🆕 personal|submitted|active|archived
submitted_to_campaign_id uuid NULL -- 🆕 FK vers campaigns
```

### Interface MJ — Ce que voit le MJ vs ce que voit le Joueur

| Élément | MJ (en campagne) | Joueur (en campagne) |
|---------|-----------------|---------------------|
| **Carte** (CampaignMap) | ✅ Avec contrôles (créer scènes, tokens, fog edit, upload fond) | ✅ Lecture seule (zoom, pan, fog appliqué) |
| **Scènes** — sélecteur | ✅ Toutes les scènes | ✅ Scènes actives uniquement |
| **Scènes** — créer/supprimer | ✅ | ❌ |
| **Tokens** — créer/déplacer | ✅ | ❌ |
| **Tokens** — voir | ✅ Tous | ✅ Uniquement non-hidden |
| **Fog of War** — éditer | ✅ Outil de révélation | ❌ (juste voir le fog) |
| **Assets** — uploader fond | ✅ | ❌ |
| **Personnages** — créer pour autres | ✅ (GM crée pour n'importe quel joueur) | ❌ (crée seulement le sien) |
| **Personnages** — vault personnel | ✅ | ✅ |
| **Personnages** — soumettre | ❌ (GM peut directement ajouter) | ✅ (soumet au MJ pour approbation) |
| **Personnages** — approuver soumissions | ✅ | ❌ |
| **Combat** — créer/gérer | ✅ (initiative, tours, KO, conditions) | ❌ (lecture seule : round, initiative, HP) |
| **Combat** — voir état | ✅ Complet | ✅ Read-only (persos visibles seulement) |
| **Dés** — lancer | ✅ Pour tous les persos | ✅ Pour son perso uniquement |
| **Dés** — jet secret (visibility=gm) | ✅ | ✅ |
| **Handouts** — créer/révéler/supprimer | ✅ | ❌ |
| **Handouts** — voir | ✅ Tous | ✅ Uniquement révélés |
| **Journal** — voir | ✅ Complet (toutes visibilités) | ✅ Public uniquement |
| **Journal** — écrire | ✅ Notes + annonces | ✅ Notes publiques |
| **Bibliothèque homebrew** | ✅ CRUD complet | ❌ |
| **Invitations** — créer/gérer | ✅ | ❌ |
| **Membres** — voir/gérer | ✅ | ✅ Voir seulement |
| **Paramètres campagne** | ✅ | ❌ |

---

## 📐 Nouvelle architecture

### 0. Modèle de données — Characters

```
┌──────────────────────────────────────────────────────────────┐
│                     VAULT PERSONNEL                          │
│  campaign_id = NULL, owner_user_id = user                    │
│                                                              │
│  Joueur A: "Elara" (elfe rodeuse niv.3)    status=personal  │
│  Joueur A: "Grimm" (nain guerrier niv.1)   status=personal  │
│  MJ:       "Gardes" (PNJ x4)               status=personal  │
│  MJ:       "Dragon Ancien" (boss)          status=personal  │
│                                                              │
│  ┌─── Soumettre ───┐          ┌─── Approuver ───┐           │
│  ▼                 │          ▼                 │           │
├────────────────────┼──────────┼─────────────────┼───────────┤
│              CAMPAGNE "Les Oubliés de Faerûn"               │
│                                                              │
│  Actifs:     "Elara" (status=active, campaign_id=camp)      │
│  En attente: "Grimm" (status=submitted, submitted_to=camp)  │
│  NPCs du MJ: "Gardes" (status=active, campaign_id=camp)     │
└──────────────────────────────────────────────────────────────┘
```

### 1. Interface MJ en campagne

```
┌──────────┬────────────────────────────────┬──────────────────┐
│ SIDEBAR  │  MAP (CampaignMap isGM=true)   │  PANNEAUX DROITS │
│ 210px    │                                │  320px           │
│          │  ┌──────────────────────────┐  │                  │
│ 🏰 DnD   │  │ Barre mode session      │  │  ┌────────────┐  │
│          │  │ [explo] [combat] [rp]   │  │  │ 👤 Persos  │  │
│ Mes      │  ├──────────────────────────┤  │  │            │  │
│ tables   │  │                          │  │  │ Actifs:    │  │
│ ──────── │  │    CARTE + TOKENS        │  │  │ Elara      │  │
│ • Oubliés│  │    + FOG + ZOOM/PAN      │  │  │ Gardes     │  │
│ • Raven. │  │                          │  │  │            │  │
│          │  │  [Scène ▼] [Créer] [+]  │  │  │ Soumissions│  │
│ Membres  │  │                          │  │  │ 🟡 Grimm──│──│──┐
│ ──────── │  │                          │  │  │ [✓][✕]    │  │ │
│ • Dono   │  │                          │  │  │            │  │ │
│ • Elara  │  │                          │  │  │ + Créer    │  │ │
│ • Grimm  │  │                          │  │  └────────────┘  │ │
│          │  │                          │  │                  │ │
│ [+Invite]│  │                          │  │  ┌────────────┐  │ │
│          │  │                          │  │  │ ⚔️ Combat  │  │ │
│ [Sortir] │  │                          │  │  │ Initiative │  │ │
│          │  └──────────────────────────┘  │  │ Encounters │  │ │
└──────────┴────────────────────────────────┤  └────────────┘  │ │
                                            │                  │ │
                                            │  ┌────────────┐  │ │
                                            │  │ 📄 Handouts│  │ │
                                            │  │ Créer/Rév. │  │ │
                                            │  └────────────┘  │ │
                                            │                  │ │
                                            │  ┌────────────┐  │ │
                                            │  │ 📋 Journal │  │ │
                                            │  │ Dés + Notes│  │ │
                                            │  └────────────┘  │ │
                                            │                  │ │
                                            │  ┌────────────┐  │ │
                                            │  │ 📚 Biblio  │  │ │
                                            │  │ Homebrew   │  │ │
                                            │  └────────────┘  │ │
                                            └──────────────────┘ │
                                                                  │
    Ce que le MJ voit EN PLUS du joueur :                         │
    ──────────────────────────────────────────────────────────────│
    ✅ Créer/supprimer scènes                                     │
    ✅ Créer/déplacer/supprimer tokens                            │
    ✅ Éditer le Fog of War (outil révéler)                       │
    ✅ Uploader fond de scène (assets)                            │
    ✅ Créer perso pour n'importe quel joueur                     │
    ✅ Voir + approuver/refuser les soumissions de persos ◄───────┘
    ✅ Gérer le combat (initiative, tours, KO, conditions)
    ✅ Créer/révéler/supprimer handouts
    ✅ Voir le journal complet (toutes visibilités)
    ✅ Bibliothèque homebrew (CRUD)
    ✅ Créer/gérer invitations
    ✅ Gérer les membres (rôles)
```

### 2. Interface Joueur en campagne

```
┌──────────────────────────────────────────────────────────────┐
│ TOPBAR: [🏰 Les Oubliés]  👤 Elara  🟢2 connectés  [Sortir] │
├─────────────────────────────┬────────────────────────────────┤
│  MAP (CampaignMap           │  PANNEAUX JOUEUR               │
│       isGM=false)           │  340px                         │
│                             │                                │
│  ┌────────────────────────┐ │  ┌──────────────────────────┐  │
│  │                        │ │  │ 👤 MON PERSONNAGE        │  │
│  │   CARTE + TOKENS       │ │  │                          │  │
│  │   + FOG (read-only)    │ │  │  Actif: Elara (rodeuse)  │  │
│  │   + ZOOM/PAN           │ │  │  [Modifier] [Exporter]   │  │
│  │                        │ │  │                          │  │
│  │                        │ │  │  Mon vault:              │  │
│  │                        │ │  │  Grimm (guerrier niv.1)  │  │
│  │                        │ │  │  [Soumettre à la campagne│──│──┐
│  │                        │ │  │                          │  │  │
│  │                        │ │  │  En attente:             │  │  │
│  │                        │ │  │  🟡 Grimm — en review    │  │  │
│  │                        │ │  │                          │  │  │
│  │                        │ │  │  [+ Créer dans mon vault]│  │  │
│  └────────────────────────┘ │  └──────────────────────────┘  │  │
│                             │                                │  │
│  [Scène ▼]  [−] 100% [+]   │  ┌──────────────────────────┐  │  │
│                             │  │ 🎲 DÉS                   │  │  │
└─────────────────────────────┤  │ [1d20+5] [normal] [▼]   │  │  │
                              │  │ Compétences rapides      │  │  │
    Ce que le joueur NE       │  │ Perception · Discrétion  │  │  │
    voit JAMAIS :             │  └──────────────────────────┘  │  │
    ──────────────────────    │                                │  │
    ❌ Outils de création      │  ┌──────────────────────────┐  │  │
       de scène               │  │ 📄 DOCUMENTS             │  │  │
    ❌ Édition du Fog of War   │  │ Handouts révélés         │  │  │
    ❌ Upload de fond          │  └──────────────────────────┘  │  │
    ❌ Déplacement de tokens   │                                │  │
    ❌ Gestion du combat       │  ┌──────────────────────────┐  │  │
    ❌ Création de handouts    │  │ ⚔️ COMBAT               │  │  │
    ❌ Bibliothèque homebrew   │  │ Round 3 · Gobelins       │  │  │
    ❌ Invitations             │  │ 🎯 Elara (ton perso)    │  │  │
    ❌ Gestion des membres     │  └──────────────────────────┘  │  │
    ❌ Journal complet         │                                │  │
    ❌ Voir les soumissions    │  ┌──────────────────────────┐  │  │
       des autres joueurs     │  │ 📋 JOURNAL              │  │  │
                              │  │ [Écrire une note...]    │  │  │
                              │  │ 🎲 Jet: 17 (Perception) │  │  │
                              │  │ 📝 MJ: Vous trouvez...  │  │  │
                              │  └──────────────────────────┘  │  │
                              └────────────────────────────────┘  │
                                                                  │
    Flux de soumission joueur → MJ :                              │
    ──────────────────────────────────────────────────────────────│
    1. Joueur crée Grimm dans son vault (PlayerLobby ou PlayerView)
    2. Dans PlayerView, il clique [Soumettre à la campagne]
    3. Grimm passe en status='submitted', submitted_to_campaign_id
    4. Le MJ voit 🟡 Grimm dans son panneau Persos → Soumissions
    5. MJ clique [✓] → Grimm devient status='active', campaign_id=camp
    6. Grimm apparaît dans la liste des persos actifs ◄────────────┘
```

---

## 📋 Tâches

### Phase 0 — Backend : Personnages hors campagne + soumissions

#### Task 0.1: Migration `017_personal_characters.sql`

**Objective:** Permettre `campaign_id = NULL`, ajouter `status` et `submitted_to_campaign_id`.

**Files:**
- Create: `backend/app/migrations/017_personal_characters.sql`

```sql
-- 1. Permettre les personnages hors campagne
alter table characters 
  alter column campaign_id drop not null;

-- 2. Rendre owner_user_id obligatoire (les persos ont toujours un propriétaire)
alter table characters
  alter column owner_user_id set not null;

-- 3. Statut du personnage
alter table characters
  add column if not exists status text not null default 'active'
  check (status in ('personal', 'submitted', 'active', 'archived'));

-- 4. Pour les soumissions : vers quelle campagne
alter table characters
  add column if not exists submitted_to_campaign_id uuid 
  references campaigns(id) on delete set null;

-- 5. Mettre à jour les persos existants
update characters set status = 'active' where campaign_id is not null;
update characters set status = 'personal' where campaign_id is null;

-- 6. Index
create index if not exists characters_status_idx on characters(status);
create index if not exists characters_submitted_to_idx on characters(submitted_to_campaign_id);
```

#### Task 0.2: Mise à jour schemas.py — CharacterPublic + nouveaux types

**Files:**
- Modify: `backend/app/schemas.py`

Ajouter `status` et `submitted_to_campaign_id` dans `CharacterBase` / `CharacterPublic`.

Ajouter :
```python
class CharacterSubmitRequest(BaseModel):
    campaign_id: UUID

class CharacterApproveRequest(BaseModel):
    approved: bool = True  # True = approve, False = reject
```

#### Task 0.3: Nouveaux endpoints dans characters.py

**Files:**
- Modify: `backend/app/routers/characters.py`

Nouveaux endpoints :
```
GET    /api/characters/mine
  → SELECT * FROM characters WHERE owner_user_id = current_user AND campaign_id IS NULL
  → Accès: propriétaire

POST   /api/characters
  → INSERT avec campaign_id=NULL, status='personal'
  → Accès: MJ ou Joueur

POST   /api/characters/{id}/submit
  → Body: { campaign_id: UUID }
  → Vérifie: owner = current_user, status = 'personal'
  → Vérifie: current_user est membre de la campagne
  → UPDATE: status='submitted', submitted_to_campaign_id=campaign_id
  → Accès: propriétaire

GET    /api/campaigns/{campaign_id}/submissions
  → SELECT * FROM characters WHERE submitted_to_campaign_id = campaign_id AND status = 'submitted'
  → Accès: gm, co_gm

PATCH  /api/characters/{id}/approve
  → Body: { approved: true }
  → Vérifie: current_user est GM/co_GM de submitted_to_campaign_id
  → Si approuvé: UPDATE campaign_id = submitted_to_campaign_id, status = 'active'
  → Si refusé: UPDATE status = 'personal', submitted_to_campaign_id = NULL
  → Accès: gm, co_gm
```

#### Task 0.4: Tests unitaires — characters vault + submission

**Files:**
- Modify: `backend/tests/test_security.py` (ou nouveau `test_characters.py`)

Tests :
- `test_create_personal_character` → 201, campaign_id=NULL
- `test_list_my_characters` → retourne uniquement ceux du user
- `test_submit_character_to_campaign` → status='submitted'
- `test_submit_not_owner` → 403
- `test_submit_not_member` → 400
- `test_approve_submission_as_gm` → status='active', campaign_id set
- `test_approve_as_player` → 403
- `test_reject_submission` → status='personal', submitted_to_campaign_id=NULL

---

### Phase 1 — Extraction de CampaignMap (inchangé)

#### Task 1.1: Créer CampaignMap.tsx

**Files:**
- Create: `frontend/src/components/CampaignMap.tsx`
- Modify: `frontend/src/components/VttBoard.tsx`
- Modify: `frontend/src/components/PlayerView.tsx`

#### Task 1.2: Nettoyer PlayerMap (obsolète)

---

### Phase 2 — Interface MJ : refonte layout en-campagne

#### Task 2.1: Nouveau layout — sidebar + map + panneaux droits

**Files:**
- Modify: `frontend/src/App.tsx` (branche 7)

**Layout cible :** (voir diagramme section 1 ci-dessus)

Supprimer du workspace GM :
- ❌ Panneau « Nouvelle campagne » (→ déjà dans GmLobby)
- ❌ Panneau « Tables actives » (→ sidebar compacte)
- ❌ CampaignViewTabs 7 onglets (→ panneaux droits ancrables)

Ajouter :
- ✅ Sidebar gauche 210px : branding, liste campagnes, membres, bouton inviter, logout
- ✅ Zone centrale : CampaignMap (isGM=true) avec barre mode session live
- ✅ Panneaux droits 320px : onglets verticaux (Persos, Combat, Handouts, Journal, Biblio)

#### Task 2.2: Panneau Persos MJ — avec soumissions

Dans le panneau droit « 👤 Personnages » :
```
┌─ 👤 Personnages ─────────────────────┐
│                                       │
│ ACTIFS DANS LA CAMPAGNE               │
│ ┌───────────────────────────────────┐ │
│ │ Elara  Rôdeuse Niv.3  PV 24/24   │ │
│ │ [Modifier]                        │ │
│ │ Gardes  Soldat Niv.2  PV 12/12   │ │
│ │ [Modifier]                        │ │
│ └───────────────────────────────────┘ │
│                                       │
│ SOUMISSIONS EN ATTENTE                │
│ ┌───────────────────────────────────┐ │
│ │ 🟡 Grimm (de Elara)               │ │
│ │    Guerrier Niv.1  PV 15/15       │ │
│ │    [✓ Approuver] [✕ Refuser]     │ │
│ └───────────────────────────────────┘ │
│                                       │
│ VAULT PERSONNEL (hors campagne)       │
│ ┌───────────────────────────────────┐ │
│ │ Dragon Ancien  Draconique Niv.20 │ │
│ │ [Ajouter à la campagne]          │ │
│ │ [+ Créer dans le vault]          │ │
│ └───────────────────────────────────┘ │
└───────────────────────────────────────┘
```

#### Task 2.3: SessionLiveModeBar extrait en composant

**Files:**
- Create: `frontend/src/components/SessionLiveModeBar.tsx`

---

### Phase 3 — Interface Joueur : refonte layout en-campagne

#### Task 3.1: Nouveau layout — map gauche + panneaux droits

**Files:**
- Modify: `frontend/src/components/PlayerView.tsx`

**Layout cible :** (voir diagramme section 2 ci-dessus)

Changements :
- ❌ Suppression des onglets mutuellement exclusifs
- ✅ Map TOUJOURS visible à gauche (CampaignMap isGM=false)
- ✅ Panneaux joueur à droite, scrollables, TOUS visibles simultanément
- ✅ Nouvelle section « Mon vault » dans le panneau Personnages

#### Task 3.2: Panneau Persos Joueur — avec vault + soumission

```
┌─ 👤 MON PERSONNAGE ──────────────────┐
│                                       │
│ ACTIF DANS LA CAMPAGNE                │
│ ┌───────────────────────────────────┐ │
│ │ Elara  Rôdeuse Niv.3  PV 24/24   │ │
│ │ [Modifier] [Exporter JSON]       │ │
│ └───────────────────────────────────┘ │
│                                       │
│ MON VAULT                             │
│ ┌───────────────────────────────────┐ │
│ │ Grimm  Guerrier Niv.1  PV 15/15  │ │
│ │ [Soumettre à la campagne]        │ │
│ │ [Modifier] [Exporter]            │ │
│ └───────────────────────────────────┘ │
│                                       │
│ EN ATTENTE D'APPROBATION              │
│ ┌───────────────────────────────────┐ │
│ │ 🟡 Grimm — en cours de review    │ │
│ └───────────────────────────────────┘ │
│                                       │
│ [+ Créer dans mon vault]              │
│ [📥 Importer JSON]                    │
└───────────────────────────────────────┘
```

#### Task 3.3: PlayerView — charger les scènes partagées

CampaignMap a besoin de `scenes`, `selectedScene`, `sceneTokens`, `sceneBackgroundObjectUrl`. Remonter les loaders de PlayerMap dans PlayerView.

---

### Phase 4 — Lobbys : sections personnages

#### Task 4.1: PlayerLobby — section « 📋 Mes personnages »

**Files:**
- Modify: `frontend/src/components/PlayerLobby.tsx`

Ajouter sous le bloc d'invitation :
```
┌─ 📋 Mes personnages ────────────────┐
│ Elara  Rôdeuse Niv.3               │
│ [Modifier] [Exporter JSON]         │
│                                     │
│ Grimm  Guerrier Niv.1              │
│ [Modifier] [Exporter JSON]         │
│                                     │
│ [+ Créer un personnage]            │
│ [📥 Importer JSON]                 │
└─────────────────────────────────────┘
```

#### Task 4.2: GmLobby — section « 📋 Ma bibliothèque »

**Files:**
- Modify: `frontend/src/components/GmLobby.tsx`

```
┌─ 📋 Ma bibliothèque ────────────────┐
│ Gardes  Soldat Niv.2  (4 tokens)   │
│ [Modifier] [Exporter]              │
│                                     │
│ Dragon Ancien  Draconique Niv.20   │
│ [Modifier] [Exporter]              │
│                                     │
│ [+ Créer un PNJ]                   │
│ [📥 Importer JSON]                 │
└─────────────────────────────────────┘
```

---

### Phase 5 — CSS & Responsive

#### Task 5.1: CSS layouts MJ + Joueur

**Files:**
- Modify: `frontend/src/styles.css`

Classes à ajouter (~400 lignes) :
- `.gm-campaign-shell` — grid: `210px 1fr 320px`
- `.gm-sidebar`, `.gm-map-area`, `.gm-panels`
- `.gm-campaign-list-compact`, `.gm-members-compact`
- `.gm-panel-tabs` — onglets verticaux
- `.player-campaign-shell` — flex column
- `.player-topbar`, `.player-workspace` (flex row)
- `.player-map-area`, `.player-panels`
- `.player-panel-section` — sections empilées dans le panneau droit
- `.character-section-vault`, `.character-section-submissions`
- `.submission-row` — ligne avec boutons approuver/refuser
- Media queries < 1024px : layout vertical

---

### Phase 6 — Build, tests, smoke

- `npx tsc --noEmit` → 0 erreur
- `npx vite build` → OK
- `.venv/bin/pytest tests/ -q` → tous les tests passent
- Smoke test manuel des 6 parcours auth + test soumission

---

### Phase 7 — Documentation

- CHANGELOG : entrée Phase 19b
- README : mise à jour métriques, composants, schéma navigation
- roadmap : marquer comme complétée

---

## 📊 Estimation

| Phase | Contenu | Fichiers | Lignes |
|-------|---------|----------|--------|
| 0. Backend vault | Migration + endpoints + tests | 3 | +200 |
| 1. CampaignMap | Extraction + intégration | 3 | +200 / -150 |
| 2. Layout GM | Refonte App.tsx + SessionLiveModeBar | 2 | +100 / -200 |
| 3. Layout Player | PlayerView + vault + soumission | 1 | +150 / -80 |
| 4. Lobbys persos | PlayerLobby + GmLobby | 2 | +100 |
| 5. CSS | +2 layouts + responsive | 1 | +400 |
| 6. Tests | TSC + Vite + pytest | — | — |
| 7. Doc | CHANGELOG, README | 3 | +50 |

**Total :** ~7 commits, 3 nouveaux composants, ~10 fichiers modifiés, ~1200 lignes
