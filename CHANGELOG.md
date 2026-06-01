# CHANGELOG

Toutes les modifications notables du projet DnD VTT.

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
