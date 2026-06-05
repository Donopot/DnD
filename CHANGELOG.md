# CHANGELOG

Toutes les modifications notables du projet DnD VTT.

---

## [v0.12] — Refonte App.tsx, contexts, API centralisation (2026-06-04/05)

### 🔧 PR #67–69 — PanelRenderer + ErrorBoundary
- PanelRenderer centralisé pour le lazy-loading des 26 panneaux GM
- Extraction GmDockedPanels (−924 lignes App.tsx)
- GmFloatingPanels avec ErrorBoundary

### ⚡ PR #70–71 — Performances
- **P1**: AbortController unifié, keydown debounce, localStorage versioning
- **P2**: SQL parameterized queries + CSS split

### 🧩 PR #72 — Extraction AppWorkspace
- GmWorkspace extrait hors App.tsx (−220 lignes)

### 🎣 PR #73–78 — Extraction hooks métier
- `useAuthSession` — token/user state + cold-start bootstrap
- `useCampaignData` — campaigns, invites, members
- `useVttState` — core VTT, tokens, combat, assets
- `useTokenActions` — moveToken + fog reveal
- `useRealtimeSession` — WebSocket connection
- `useSessionJournal` — rolls, logEntries, doRoll, quickRoll
- `useHandouts` — CRUD handouts, reveal

### 🏗 PR #80A–#86 — Migration contexts v2
- 5 domain contexts: WorkspaceState, WorkspaceActions, Vtt, Panel, Session
- GmWorkspaceProvider wrappe les 5 providers
- GmDockedPanels/GmFloatingPanels → 0 props, lecture depuis contexts
- PanelRenderer utilisé partout, App.tsx réduit à 677 lignes

### 🔌 PR #87 — Stabilité WebSocket
- Remplacement systématique `onmessage =` → `addEventListener`
- ChatPanel, useRealtimeSession, PlayerView — zéro race condition

### 🗺 PR #88 — Extraction CampaignMap
- MapToolbar (234 lignes), MapMinimap (126 lignes), useFogOfWar (246 lignes)
- CampaignMap: 1329 → 777 lignes (−42%)

### 🔗 PR #89 — Centralisation API client
- `apiRequest()` respecte AbortSignals externes
- `getAuthToken()` helper dans `api/token.ts`
- `useFogOfWar` → apiRequest, `PlayerView` → apiRequest
- Extraction MapTokensLayer (233 lignes)

### 🧪 PR #90–91 — CI Smoke + Backend async
- Playwright smoke test (login → campagne → carte → token)
- Job CI smoke test dans le workflow
- Backend assets: boto3 → `asyncio.to_thread`, Cache-Control, ETag, pagination

### 📊 Metrics
- Frontend: tsc 0, build ~650ms
- Backend: 121/121 tests
- 55 composants, 15 hooks, 118 endpoints, 26 migrations, 72 schémas

---

## [v0.11] — Toolchain, sécurité, fog polish (2026-06-03)

### Phase 41 — Documentation toolchain
- `docs/developer-toolchain.md` — source unique de vérité (uv, npm ci, .node-version, tsc --noEmit)
- `AGENTS.md` : nouvelle section « Toolchain obligatoire » + correction pip→uv
- `README.md` : stats à jour (115 endpoints, 17 routeurs, 25 migrations, 97 tests, 46 composants, 1795 modules)
- `docs/product-development.md` : python3→uv, headers réparés

### Phase 40 — Sécurité token + nettoyage orphelins
- **A** : `update_token` et `move_token` bloquent les joueurs sur tokens sans `character_id`
- **B** : Validation `aoe_shape` WebSocket (shape, size, angle, coords)
- **C** : `try/except ValueError` dans la boucle WebSocket
- **D** : 7 tests unitaires de permissions (joueur vs NPC/GM/co-GM/own token)
- **E** : `frontend/package-lock.json` régénéré
- **F** : Script `audit-orphans.py` corrigé — 0 faux positifs
- **G** : CSS mort `.vtt-board-panel` supprimé, `.quick-actions-panel` renommé
- **H** : Baseline orphelins `pre-commit.sh` : 16→18

### Phase 39 — Brouillard de guerre × tokens
- **A** : Filtrage tokens pour les joueurs — token hors fog → invisible (plus assombri)
- **B** : Indicateur MJ 👁️‍🗨️ sur les tokens cachés par le fog (classe `fog-hidden`)
- **C** : Auto-révélation autour des tokens PJ (`vision_radius`, endpoint `/api/tokens/{id}/reveal`)
- **D** : Mode cercle pour la révélation du fog (toggle ◯/▭, dessin `arc`)
- **E** : Minimap affiche les zones de fog

### Metrics
- Frontend: tsc 0, build ~680ms
- Backend: 97/97 tests pass
- Orphelins: 0

---

## [Phases 42–49] — Audio, Météo, PNJ (2026-06-02)

### Phase 46 — Ambiance audio
- 9 playlists d'ambiance (taverne, donjon, forêt, combat, etc.)
- Contrôle volume, synthé brown noise

### Phase 48 — Météo & Atmosphère
- Effets canvas animés : pluie, neige, brouillard, nuit
- Intensité réglable, activable par scène

### Phase 49 — Générateur de PNJ
- Noms, apparence, personnalité, secrets
- Tables en français, un clic pour générer

---

## [Phases 53–64] — Chat, États visuels, Audit UX (2026-06-02/03)

### Phases 53 & 59 — Chat + États visuels
- Chat de campagne (IC/OOC/whispers, dés rapides, WebSocket)
- 20 conditions sur tokens (badges emoji, max 4 affichés)

### Phases 60–64 — Audit UX
- Thème fonctionnel (23 CSS variables, 407 `var()`, light/dark)
- Nettoyage CSS dupliqué
- Navigation clavier (Escape modales, `role=dialog`, `aria-modal`)
- Composants `InlineSpinner` + `ErrorBoundary`
- Error boundaries wrapper (panels, map)

---

## [v0.11.1] — Stabilisation Fog + Invitations (2026-06-03)

### Fog of War stabilization
- Conversion ft→px correcte : `(radius_ft / 5) * grid_size`
- Stockage shape `"circle"` (plus `"rect"`)
- WebSocket fogVersion counter → évite stale listener après reconnexion
- Labels FR (Afficher/Masquer fog), Pan désactive Draw/Erase
- Rollback via snapshot `previousZones` en cas d'échec PATCH

### Debounce fog API (PR #48)
- `saveFogZones` splitté : setState local immédiat + `persistFogZones` PATCH différé 350ms
- Self-ignore WS (`ignoreNextFogWsRef`) → évite GET après propre PATCH
- Rollback avec `previousFogZonesRef` → UI ne ment pas

### Refactor useFogOfWar hook
- Extraction du hook `useFogOfWar` (173 lignes) — état fog, PATCH débouncé, listener WS
- `wsEpoch` incrémenté à chaque `connect()` → listener ré-enregistré sur nouveau socket
- `CampaignMap.tsx` : −143 lignes (5 useEffect + 2 useCallback → 1 appel hook)
- `App.tsx` : `fogVersion` mort → `wsEpoch` vivant

### Consolidation documentaire
- 20+ docs → 7 documents canoniques (~3000 lignes) :
  `product-roadmap`, `frontend-ui`, `vtt-map-fog`, `backend-api`, `security-auth`, `deployment-ops`, `srd-content`

### Invite system fixes (PR agent/fix/invite-system-fixes)
- Fix #1 (P0) : `latestInvite` affiché dans l'UI avec lien copiable
- Fix #2 (P1) : Regex token `[\\\\w-]` → `[\w-]` — parse correct des tokens base64url
- Fix #3 (P2) : Endpoint `POST /api/invites/{token}/revoke` + boutons ✕ dans liste
- Liste des invitations actives dans le panel campagne

### Metrics
- Frontend: tsc 0, build 961ms, 1798 modules
- Backend: 118/118 tests, 114 endpoints, 18 routeurs, 25 migrations
- Composants: 46 React, Hooks: 7

---

## [Phases 34–38] — Plan UX : Interface complète (2026-06-02)

### Phase 34 — Correctifs critiques
- **1.1** Hook `useSceneBackground()` partagé — le fond de carte est maintenant chargé côté joueur
- **1.2** Auto-centrage de la carte au changement de scène
- **1.3** Mode focus map — bouton Maximize/Minimize dans la topbar GM (raccourci `F`)
- **1.4** Resize handles CSS sur sidebar (160–340px) et panneaux (240–500px)

### Phase 35 — Panneaux flottants
- **2.1** Hook `useFloatingPanels()` + composant `FloatingPanel` (drag, resize, minimize, persist localStorage)
- **2.2-2.4** Boutons détacher sur Combat, Dés, Rencontres → panneaux flottants draggables
- **2.5** Toggle masquer/afficher tous les panneaux dans la topbar GM

### Phase 36 — Interface joueur refondue
- **3.1** Barre d'onglets (👤🎲📄⚔️📝) remplaçant le scroll monolithique
- **3.2** Boutons d20 rapides (Initiative, Attaque, Avantage, Sauvegarde, Compétence)
- **3.3** MapTools déjà accessible aux joueurs (ping + règle) — confirmé
- **3.4** Notifications combat en overlay (toast animé 3s)

### Phase 37 — Carte immersive
- **4.1** Minimap canvas 160×120 (tokens, viewport rect, grid) en bas à droite
- **4.2** Raccourcis clavier : Space=pan, G=grid, F=fullscreen, 0=reset zoom, Ctrl+Z=undo
- **4.3** Snap highlight visuel pendant le drag de token
- **4.4** États visuels tokens : bloodied (glow rouge), defeated (gris), concentrating (glow or)
- **4.5** Transition entre scènes : fondu 300ms

### Phase 38 — Polish & DX
- **5.1** Rendu Markdown des handouts (`marked`) — plus de `<pre>` brut
- **5.2** Thème dark/light avec toggle ☀️/🌙 (CSS variables, localStorage)
- **5.4** Skeleton loaders animés (shimmer) pour les composants lazy
- **5.5** Toast system (`useToast`) remplaçant MessageDock — auto-dismiss 4s, stack

### Added
- 8 nouveaux fichiers : `useSceneBackground`, `useFloatingPanels`, `useTheme`, `useToast`, `FloatingPanel`, `MarkdownRenderer`
- CSS: +770 lignes (floating panels, tab bar, minimap, tokens, skeletons, toasts, markdown)

### Metrics
- TSC: 0 erreur, Build: 474ms/348 kB, Tests: 54/54
- 5 phases, ~14h estimées → réalisées en 1 session

---

## [Audit UX + Plan d'amélioration] — Revue exhaustive frontend (2026-06-01)

### Added
- `docs/frontend-improvement-plan.md` — audit complet 45 composants + 11 855 lignes CSS
- **5 problèmes critiques identifiés** : fond de carte joueur cassé (bug), pas de mode focus map, pas de panneaux flottants, pas de resize, joueur pas d'onglets
- **7 problèmes majeurs** : thème figé, outils map inaccessibles joueurs, message dock minimal, pas de raccourcis clavier, pas de minimap
- **Plan d'amélioration 5 phases** : 16 tâches priorisées, ~14h estimées

### Fixed
- Aucun correctif dans ce commit — le document liste les actions à venir

---

## [Phase 33] — Statistiques de session (2026-06-01)

### Added
- `SessionStats.tsx` : compteurs de session (jets totaux, Nat 20, Nat 1, moyenne, graphique)
- Backend : logs de jets étendus pour analytics

### Files
- `frontend/src/components/SessionStats.tsx` — nouveau
- `frontend/src/styles.css` — +CSS session stats

---

## [Phase 32] — Macros / Quick Actions (2026-06-01)

### Added
- `QuickActions.tsx` : barre d'actions rapides personnalisables
- Types : ability check, saving throw, custom roll, attack
- Persistance localStorage

### Files
- `frontend/src/components/QuickActions.tsx` — nouveau
- `frontend/src/styles.css` — +CSS macros

---

## [Phase 31] — Dés visuels animés (2026-06-01)

### Added
- `DiceRoller.tsx` : animations CSS 3D pour d4-d20
- Nat 20 glow vert, Nat 1 rouge
- Mode avantage/désavantage
- Historique des jets

### Files
- `frontend/src/components/DiceRoller.tsx` — nouveau
- `frontend/src/styles.css` — +CSS animations dés

---

## [Phase 30] — Générateur de rencontres (2026-06-01)

### Added
- `EncounterBuilder.tsx` : CR calculator basé DMG 5e
- Génération par biome (forêt, donjon, montagne, etc.)
- Ajustement difficulté (easy/medium/hard/deadly)
- Liste de monstres avec stats

### Files
- `frontend/src/components/EncounterBuilder.tsx` — nouveau
- `frontend/src/styles.css` — +CSS encounter builder

---

## [Phase 29] — Système de combat complet (2026-06-01)

### Added
- `CombatTracker.tsx` : tracker visuel avec initiative triée, HP, conditions
- Timer par round
- Boutons Next Turn / Add Condition / Damage rapide
- 3 nouveaux endpoints : `POST /combat/next-turn`, `POST /combat/add-condition`, `POST /combat/remove-condition`

### Files
- `frontend/src/components/CombatTracker.tsx` — nouveau
- `backend/app/routers/combat.py` — +3 endpoints
- `frontend/src/styles.css` — +300 lignes combat tracker

---

## [Phase 28] — 🔥 Upgrade total de la Map (2026-06-01)

### Fixed
- 6 bugs critiques : token data-token-id manquant, scene_id vide, pointerEvents tokens joueurs, pan toggle, Set() recréé, zoom/scroll non reset
- Correction `player_controlled`/`owner_user_id` → `character_id`

### Added
- Snap-to-grid universel (ruler, AoE, drag)
- Zoom-to-cursor
- Grid toggle
- Token nameplates + HP bars avec barres de vie
- Selection ring animé
- AoE labels
- Fog undo

### Files
- `frontend/src/components/CampaignMap.tsx` — refonte
- `frontend/src/components/MapTools.tsx` — snap-grid
- `frontend/src/components/FogLayer.tsx` — undo
- `frontend/src/styles.css` — +CSS map upgrade

---

## [Phase 27] — Beta privée (2026-06-01)

### Added
- README complet (déploiement, fonctionnalités, architecture)
- Roadmap finale 33 phases
- Instructions déploiement HP Mini

### Files
- `README.md` — refonte complète
- `docs/roadmap.md` — final

---

## [Phase 26] — Sauvegardes et maintenance (2026-06-01)

### Added
- `scripts/backup-db.sh` : dump PostgreSQL + gzip, rotation 7 jours
- Cron job 03h00 : backup automatique
- Endpoint `/api/health` (DB + S3)

### Files
- `scripts/backup-db.sh` — nouveau
- Cron jobs : +3 (backup 03h, audit 06h, suggestions 07h30)

---

## [Phase 25] — SRD règles D&D (2026-06-01)

### Added
- `RulesReference.tsx` : 12 sections (règles de base, classes, races, sorts, conditions, combat, équipement)
- Barre de recherche

### Files
- `frontend/src/components/RulesReference.tsx` — nouveau
- `frontend/src/styles.css` — +CSS rules reference

---

## [Phase 24] — Gabarits AoE (2026-06-01)

### Added
- WebSocket `map_aoe` : cone, sphere, cube, line
- `MapTools.tsx` : 4 onglets AoE + labels dimensions
- Passage `gridSize` depuis CampaignMap
- CSS formes AoE

### Files
- `frontend/src/components/MapTools.tsx` — +AoE tools
- `backend/app/ws.py` — +aoe handler
- `frontend/src/styles.css` — +CSS AoE shapes

---

## [Phase 23] — Gestion personnages par le MJ (XP, conditions, HP, inventaire) (2026-06-01)

### Added
- Migration `019_character_management.sql` : colonnes `xp` (int) et `conditions` (jsonb)
- 5 nouveaux endpoints GM dans `characters.py` :
  - `PATCH /api/characters/{id}/xp` — ajouter XP (+ log journal)
  - `PATCH /api/characters/{id}/conditions` — définir conditions actives (+ log)
  - `PATCH /api/characters/{id}/hp` — soin/dégâts PV (+ log, clampé 0–max)
  - `PATCH /api/characters/{id}/inventory` — add/remove/update objet (+ log)
  - `PATCH /api/characters/{id}/resources` — add/remove/update ressource (+ log)
- `GmCharacterInspector.tsx` : modal inspection personnage (322 lignes)
  - Stats rapides (PV, CA, XP, Bonus maîtrise) avec barre PV
  - Ajustement HP avec boutons rapides (±5, ±10)
  - Ajout XP avec note
  - 17 conditions en chips checkbox
  - Gestion inventaire (ajout objet avec nom/qte/desc, suppression)
- `App.tsx` : bouton 🔍 sur chaque personnage GM → modal inspector

### Changed
- `CharacterPublic` : ajout `xp`, `conditions`
- `Character` (frontend type) : ajout `xp`, `conditions`

### Files
- `backend/app/migrations/019_character_management.sql` — nouveau (5 lignes)
- `backend/app/routers/characters.py` — +202 lignes (5 endpoints)
- `backend/app/schemas.py` — +35 lignes (5 schemas + CharacterPublic)
- `frontend/src/components/GmCharacterInspector.tsx` — nouveau (322 lignes)
- `frontend/src/App.tsx` — +42 lignes (inspector modal)
- `frontend/src/api/types.ts` — +2 lignes
- `frontend/src/styles.css` — +296 lignes

---

## [Phase 22] — Map interactive joueur (ping, règle, drag token) (2026-06-01)

### Added
- `MapTools.tsx` : composant interactivité carte (229 lignes)
  - Ping : clic sur la carte → broadcast position, animation dot 2.5s
  - Règle : clic-début → clic-fin → mesure distance affichée en pieds (snap 5ft)
  - Drag token : les joueurs peuvent déplacer leurs propres tokens (par character_id)
  - Toolbar flottante avec boutons Crosshair / Ruler
- WebSocket handlers dans `session.py` :
  - `map_ping` : broadcast position ping à tous les clients
  - `ruler` : broadcast mesure visuelle aux autres joueurs
  - `player_move_token` : validation propriétaire via join characters, update DB, broadcast
- CSS : `.map-tools-bar`, `.map-tool-btn`, `.map-ping-dot` (animation fade), `.map-ruler`, `.ruler-label`

### Changed
- `CampaignMap.tsx` : intégration `<MapTools>`, nouvelle prop `userId`, filtrage `myTokenIds` via `character_id` → `owner_user_id`
- `PlayerView.tsx` : passage `wsRef` + `userId` à CampaignMap
- `App.tsx` : passage `userId` à CampaignMap

### Fixed
- WebSocket `player_move_token` : colonnes `pos_x/pos_y` → `x/y` (noms corrects)
- WebSocket `player_move_token` : colonnes inexistantes `player_controlled/owner_user_id` → join `characters`
- MapTools `myTokenIds` : filtrage par `character_id` au lieu de colonnes inexistantes

### Files
- `frontend/src/components/MapTools.tsx` — nouveau (229 lignes)
- `frontend/src/components/CampaignMap.tsx` — +29/-2 lignes
- `frontend/src/components/PlayerView.tsx` — +2 lignes
- `frontend/src/App.tsx` — +2 lignes
- `backend/app/routers/session.py` — +74/-2 lignes
- `frontend/src/styles.css` — +108 lignes (MapTools)

---

## [Phase 21] — Communication MJ↔Joueur (messages, annonces, jets secrets) (2026-06-01)

### Added
- Migration `018_gm_messages.sql` : table `gm_messages` (type message/announcement/secret_roll)
- Router `messages.py` : 7 nouveaux endpoints
  - `POST /api/campaigns/{id}/messages` — envoyer message privé
  - `POST /api/campaigns/{id}/announce` — annonce broadcast à tous les joueurs
  - `POST /api/campaigns/{id}/secret-roll` — jet secret (visible joueur cible + MJ)
  - `GET /api/campaigns/{id}/messages/inbox` — boîte de réception joueur
  - `GET /api/campaigns/{id}/announcements` — liste annonces
  - `PATCH /api/messages/{id}/read` — marquer comme lu
- `GmMessagePanel.tsx` : panneau communication MJ (3 tabs 💬 msg / 📢 annonces / 🎲 jets secrets)
- `PlayerNotifications.tsx` : cloche 🔔 avec dropdown inbox + annonces, polling 30s

### Changed
- `App.tsx` : intégration `GmMessagePanel` dans la 3e colonne GM
- `PlayerView.tsx` : intégration `PlayerNotifications` dans le header joueur
- `styles.css` : +205 lignes (message panels, notifications)

### Files
- `backend/migrations/018_gm_messages.sql` — nouveau
- `backend/app/routers/messages.py` — nouveau (7 endpoints)
- `backend/app/schemas.py` — +4 schémas (GmMessageCreate, etc.)
- `backend/tests/test_messages.py` — nouveau (7 tests)
- `frontend/src/components/GmMessagePanel.tsx` — nouveau
- `frontend/src/components/PlayerNotifications.tsx` — nouveau
- `frontend/src/App.tsx` — intégration panel
- `frontend/src/components/PlayerView.tsx` — intégration notifications

---

## [Phase 20] — Refonte Totale Interfaces MJ/Joueur + Vault Personnages (2026-06-01)

### Added
- Migration `017_personal_characters.sql` : `campaign_id` nullable, `status` (personal/submitted/active/archived), `submitted_to_campaign_id`
- Backend endpoints vault personnages :
  - `POST /api/characters` — créer un personnage personnel (hors campagne)
  - `GET /api/characters/mine` — lister ses personnages personnels
  - `POST /api/characters/{id}/submit` — soumettre un personnage au MJ d'une campagne
  - `POST /api/characters/{id}/approve` / `reject` — MJ approuve/rejette une soumission
- `CampaignMap.tsx` : composant carte partagé extrait de VttBoard (258 lignes, prop `isGM`)
- `PersonalCharactersSection.tsx` : vault personnages réutilisable dans les deux lobbies
  - Création rapide (nom uniquement)
  - Liste avec attributs, classe, niveau, modificateurs
  - Bouton soumettre au MJ (si le joueur est dans une campagne)
- Layout GM 3 colonnes : sidebar (210px) | carte | panneaux (320px)
- Layout Joueur : carte à gauche + panneaux à droite (plus d'onglets, tous visibles simultanément)
- WebSocket : scène, tokens, handouts et combat synchronisés en temps réel pour les joueurs

### Changed
- `App.tsx` : layout GM remplacé par grille 3 colonnes, layout Joueur par flex carte+panneaux
- `PlayerView.tsx` : refonte complète (map chargement scènes, layout map+panneaux, plus d'onglets)
- `PlayerLobby.tsx` : ajout section personnages personnels + prop `activeCampaignId`
- `GmLobby.tsx` : ajout section personnages personnels + prop `token`

### Files
- `migrations/017_personal_characters.sql` — nouveau (14 lignes)
- `backend/app/routers/characters.py` — +193 lignes (5 endpoints vault)
- `backend/app/schemas.py` — +14 lignes (CharacterPublic, SubmitRequest, ApproveRequest)
- `backend/tests/test_security.py` — +75 lignes (6 tests schema)
- `frontend/src/components/CampaignMap.tsx` — nouveau (258 lignes)
- `frontend/src/components/PersonalCharactersSection.tsx` — nouveau (205 lignes)
- `frontend/src/App.tsx` — +200/-370 lignes (layouts MJ et Joueur)
- `frontend/src/components/PlayerView.tsx` — +116/-110 lignes (refonte layout)
- `frontend/src/components/PlayerLobby.tsx` — +20 lignes (section persos)
- `frontend/src/components/GmLobby.tsx` — +6 lignes (section persos)
- `frontend/src/styles.css` — +888 lignes (PersonalChars + responsive tablet/mobile)

---

## [Phase 19] — Refonte Auth & Routage 4 Layouts (2026-06-01)

### Added
- `AuthPage.tsx` : page unique login/register remplaçant LandingPage + AuthView
  - Choix GM/Joueur dans le formulaire d'inscription (radio cards)
  - Indicateur force mot de passe (barre colorée)
  - Confirmation mot de passe avec validation inline
  - Honeypot anti-bot (champ website caché)
  - 2 niveaux (invite context vs standalone)
- `PlayerLobby.tsx` : hall joueur sans campagne (entrer code invitation, preview, join)
- `GmLobby.tsx` : hall MJ sans campagne (formulaire création campagne)
- `InvitePreviewCard.tsx` : composant réutilisable preview + join invitation
- Backend sécurité : `confirm_password`, complexité mot de passe (minuscule/majuscule/chiffre), honeypot
- 6 nouveaux tests unitaires backend (RegisterRequest schema validation)

### Changed
- App.tsx : nouveau routage 7 branches explicites (invite+user, invite+!user, !user, player 0 camp, player+ camp, gm 0 camp, gm+ camp)
- InvitePage.tsx : réduit au cas "déjà connecté + lien invite" (le cas non-connecté est géré par AuthPage)

### Removed
- `LandingPage.tsx` : absorbé par AuthPage
- `AuthView.tsx` : absorbé par AuthPage
- `handleAuth` dans App.tsx : inline dans les callbacks AuthPage
- States `mode`, `accountType`, `landingStep` dans App.tsx

### Files
- `frontend/src/components/AuthPage.tsx` — nouveau (264 lignes)
- `frontend/src/components/PlayerLobby.tsx` — nouveau (102 lignes)
- `frontend/src/components/GmLobby.tsx` — nouveau (92 lignes)
- `frontend/src/components/InvitePreviewCard.tsx` — nouveau (98 lignes)
- `frontend/src/App.tsx` — +80/-110 lignes (refonte routage)
- `frontend/src/components/InvitePage.tsx` — -115 lignes (réduit)
- `frontend/src/styles.css` — +470 lignes (AuthPage, lobbys)
- `backend/app/schemas.py` — +22 lignes (RegisterRequest)
- `backend/app/routers/auth.py` — +4 lignes (honeypot)
- `backend/tests/test_security.py` — +50 lignes (6 tests)

---

## [Phase 18] — Interactions Joueur (2026-06-01)

### Added
- `PlayerMap.tsx` : carte read-only pour le joueur (scène active, tokens visibles, fog of war, zoom/pan)
- WebSocket temps réel dans PlayerView (mise à jour automatique scène/token/handout/combat)
- Onglet Journal : historique de session public + écriture de notes
- Onglet Carte : intégration PlayerMap avec sélecteur de scènes
- Import/Export JSON de personnage (boutons dans l'onglet Personnages)
- Jets avec avantage/désavantage (toggle normal/advantage/disadvantage)
- Jets par compétence (boutons contextuels basés sur les skills du perso)
- Badge "🎯 Ton perso" dans l'onglet Combat pour les combattants player_controlled

### Changed
- `PlayerView.tsx` : refonte complète, 4→6 onglets, WebSocket, dés améliorés
- `FogLayer.tsx` déjà compatible `isGM=false` (utilisé par PlayerMap)

### Files
- `frontend/src/components/PlayerMap.tsx` — nouveau (217 lignes)
- `frontend/src/components/PlayerView.tsx` — +360/-35 lignes (refonte)
- `frontend/src/styles.css` — +260 lignes (map joueur, journal, dés, compétences)

---

## [Phase 17] — Auth GM/Joueur distinct (2026-06-01)

### Added
- Migration `016_account_type.sql` : colonne `account_type` (`gm`|`player`) sur `users`
- `LandingPage.tsx` : page d'accueil avec deux chemins clairs (MJ / Joueur)
- `AuthView.tsx` refondu : badge de rôle, champ code d'invitation pour joueurs
- `require_gm_account` : bloque les comptes player de créer des campagnes
- Validation invitation à l'inscription player (auto-join campagne)

### Changed
- `POST /api/auth/register` : `account_type` et `invite_token` requis pour joueurs
- `UserPublic` : inclut `account_type`
- `InvitePage.tsx` : force `account_type=player`, passe `invite_token` à l'inscription
- `App.tsx` : nouvelle landing step avant auth, routage par account_type

### Fixed
- `FogLayer.tsx` : `pointer-events: auto` sur canvas, coordonnées corrigées pour zoom, panMode
- `VttBoard.tsx` : propagation `zoom` et `panMode` au FogLayer

### Files
- `backend/app/migrations/016_account_type.sql` — nouveau
- `backend/app/routers/auth.py` — +60 lignes (validation invite, account_type)
- `backend/app/deps.py` — +10 lignes (`require_gm_account`)
- `backend/app/schemas.py` — +3 champs
- `backend/app/routers/campaigns.py` — +2 lignes (require_gm_account)
- `frontend/src/components/LandingPage.tsx` — nouveau (59 lignes)
- `frontend/src/components/AuthView.tsx` — refonte complète
- `frontend/src/components/InvitePage.tsx` — +25/-15 lignes
- `frontend/src/App.tsx` — +35/-10 lignes
- `frontend/src/api/types.ts` — +1 champ
- `frontend/src/components/FogLayer.tsx` — fixes bugs
- `frontend/src/components/VttBoard.tsx` — +2 props
- `frontend/src/styles.css` — +135 lignes (landing, auth-role-badge)

---

## [Phase 16] — Fog of War (2026-06-01)

### Added
- Migration `015_phase16_fog_of_war.sql` : colonne `fog_zones` JSONB sur `campaign_scenes`
- `GET /api/scenes/{id}/fog` : récupère les zones révélées
- `PATCH /api/scenes/{id}/fog` : met à jour les zones (GM uniquement)
- `FogLayer.tsx` : canvas overlay sur la carte, outil drag-to-reveal, toggle ON/OFF
- Broadcast WebSocket temps réel des changements de fog

### Files
- `backend/app/migrations/015_phase16_fog_of_war.sql` — nouveau
- `backend/app/routers/vtt.py` — +52 lignes (endpoints fog)
- `frontend/src/components/FogLayer.tsx` — nouveau (192 lignes)
- `frontend/src/components/VttBoard.tsx` — +8 lignes (intégration)
- `frontend/src/styles.css` — +42 lignes
- `scripts/smoke-phase16.sh` — nouveau

---

## [Phase 9 Homebrew] — Bibliothèque Homebrew frontend (2026-06-01)

### Added
- `HomebrewPanel.tsx` : liste, détail, création créatures et objets
- CRUD complet (créer, lister, voir, supprimer)
- Boutons « Ajouter à la scène » et « Ajouter au combat » pour les créatures
- Import/Export JSON de toute la bibliothèque
- Types `HomebrewCreature` et `HomebrewItem`

### Files
- `frontend/src/components/HomebrewPanel.tsx` — nouveau (473 lignes)
- `frontend/src/api/types.ts` — +30 lignes
- `frontend/src/App.tsx` — +9 lignes
- `frontend/src/styles.css` — +98 lignes

---

## [Phase 15] — Journal structuré (2026-06-01)

### Added
- Catégories de journal : general, combat, rp, exploration, gm_note
- Épinglage/dépinglage des entrées
- Marqueurs de session (début/fin)
- Filtres par catégorie dans le panneau journal
- Champs `linked_scene_id`, `linked_encounter_id`, `linked_character_id` sur les entrées

### Changed
- `SessionLogPanel` enrichi avec pin/unpin, sélecteur de catégorie, marqueur session
- Type `GameLogEntry` étendu avec 6 nouveaux champs

### Files
- `frontend/src/api/types.ts` — GameLogEntry enrichi
- `frontend/src/components/SessionLogPanel.tsx` — refonte complète
- `frontend/src/components/SessionWorkspace.tsx` — props journal
- `frontend/src/App.tsx` — callback `onRefresh` journal
- `frontend/src/styles.css` — styles journal enhancement
- `backend/app/migrations/013_phase15_journal.sql` — migration colonnes journal

---

## [Phase 14] — Interface Joueur (2026-06-01)

### Added
- `PlayerView.tsx` : dashboard joueur 4 onglets (personnages, dés, handouts, combat)
- `InvitePage.tsx` : page `/invite/{token}` avec preview et acceptation
- Détection automatique du rôle : si `campaign.role === "player"` → PlayerView

### Changed
- `App.tsx` : routage PlayerView + InvitePage
- Un joueur ne voit plus l'interface GM complète

### Files
- `frontend/src/components/PlayerView.tsx` — nouveau (789 lignes)
- `frontend/src/components/InvitePage.tsx` — nouveau (186 lignes)
- `frontend/src/App.tsx` — +41 lignes
- `frontend/src/styles.css` — +526 lignes

---

## [Phase 13] — Fiche personnage éditable (2026-06-01)

### Added
- `EditCharacterSheet.tsx` : fiche full éditable (nom, stats, attributs, inventaire, sorts, attaques, ressources)
- Mode édition avec formulaire inline + bouton ✏️
- Champs JSONB édités en texte avec validation
- Affichage read-only enrichi (bonus de caractéristiques, inventaire, attaques, sorts, ressources)

### Changed
- `App.tsx` : remplace la preview read-only par EditCharacterSheet
- `PlayerView.tsx` : idem pour les joueurs

### Files
- `frontend/src/components/EditCharacterSheet.tsx` — nouveau (467 lignes)
- `frontend/src/App.tsx` — -30/+20 lignes
- `frontend/src/components/PlayerView.tsx` — -40/+40 lignes
- `frontend/src/styles.css` — +157 lignes

---

## [Phase 12] — Contrôles visibilité (2026-06-01)

### Added
- Boutons toggle visible/caché par token dans VisibilityInspectorPanel
- Boutons "Tout révéler" / "Tout cacher" (bulk)
- API PATCH `/api/tokens/:id` pour `is_hidden`

### Changed
- `VisibilityInspectorPanel.tsx` : 3 nouveaux callbacks + boutons
- `VttBoard.tsx` : handlers API inline pour visibilité

### Files
- `frontend/src/components/VisibilityInspectorPanel.tsx` — +112/-39 lignes
- `frontend/src/components/VttBoard.tsx` — +50 lignes
- `frontend/src/styles.css` — +36 lignes

---

## [Phase 10] — Handouts frontend (2026-06-01)

### Added
- `HandoutPanel.tsx` : création, liste, révélation, suppression de handouts
- Badges de visibilité (🌐 Public, 👥 Joueurs, 🔒 MJ)
- Fond vert pour handouts révélés
- Broadcast WebSocket temps réel pour les révélations

### Fixed
- `api.ts` : gestion des réponses 204 No Content (les DELETE ne crash plus)

### Files
- `frontend/src/components/HandoutPanel.tsx` — nouveau (173 lignes)
- `frontend/src/App.tsx` — +107 lignes
- `frontend/src/SessionWorkspace.tsx` — +19 lignes
- `frontend/src/styles.css` — +105 lignes
- `frontend/src/types.ts` — type Handout

---

## [Review] — Correction backend complète (2026-06-01)

### Fixed
- `import random` inline → déplacé au niveau module
- `except Exception` → `except PyJWTError` dans security.py et session.py
- Pagination absente sur `list_rolls` et `list_log` → `offset`/`limit` ajoutés
- `player_encounter` retournait un `dict` brut → `PlayerEncounterPublic` créé

### Added
- `slowapi` : rate limiting (5/min register, 10/min login, 200/min global)
- `utils.py` : `decode_json()` et `jsonb()` centralisés
- Index `combat_log.event_type`
- Filtrage métadonnées tokens pour joueurs (`token_public_filtered()`)
- 33 tests unitaires pytest (`test_dice.py`, `test_security.py`, `test_utils.py`)

### Changed
- 6 routeurs : suppression des définitions locales de `decode_json`

---

## [Phases 9→15] — Backend complet (2026-06-01)

### Added
- 7 commits, 40 endpoints, 13 migrations, 11 routeurs, ~5000 lignes Python
- Dés, journal, scènes, tokens, combat, assets, handouts, créatures homebrew, notes MJ, interface joueur
- Rate limiting, tests unitaires, smoke tests
