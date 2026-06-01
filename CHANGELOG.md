# CHANGELOG

Toutes les modifications notables du projet DnD VTT.

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
