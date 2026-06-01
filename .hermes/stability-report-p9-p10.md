# Rapport de stabilité — Phases 9 et 10

Date : 2026-06-01

## Phase 9 — Token UX (snap_to_grid, token_moved)

| Test | Résultat |
|------|----------|
| Compilation Python | ✅ |
| Shell syntax (smoke-phase9.sh) | ✅ |
| Schémas importés par vtt.py | ✅ TokenMoveRequest, SceneSettingsUpdateRequest |
| ScenePublic ↔ colonnes DB | ✅ snap_to_grid, view_zoom, view_pan_x/y |
| Migration idempotente (008) | ✅ all `add column if not exists` |
| move_token permissions | ✅ gm/co_gm/player (cohérent avec update_token) |
| update_scene_settings permissions | ✅ gm/co_gm |
| broadcast_token_move event | ✅ payload correct (type, token_id, x, y) |
| Création scène → defaults DB | ✅ snap_to_grid=true via DB default |
| Aucune régression sur routes existantes | ✅ |
| Routes API : /tokens/{id}/move | ✅ |
| Routes API : /scenes/{id}/settings | ✅ |

## Phase 10 — Handouts

| Test | Résultat |
|------|----------|
| Compilation Python | ✅ |
| Shell syntax (smoke-phase10.sh) | ✅ |
| Schémas importés par handouts.py | ✅ HandoutCreateRequest, HandoutUpdateRequest, HandoutPublic |
| Migration idempotente (009) | ✅ `create table if not exists` |
| Router enregistré dans main.py | ✅ |
| Visibilité GM (4 types) | ✅ public, players, gm, gm_team |
| Filtrage joueur dans list_handouts | ✅ _visibility_filter() |
| 404 pour handout non autorisé (get_handout) | ✅ masque l'existence |
| reveal tracking (revealed_at) | ✅ case when SQL |
| Broadcast sur reveal | ✅ session_changed resource=handout |
| Validation scene_id / asset_id | ✅ validate_handout_links() |
| Routes CRUD complètes | ✅ GET/POST/PATCH/DELETE |

## Résumé

- **9 migrations** au total (001→009), toutes idempotentes
- **9 routeurs** enregistrés
- **Compilation Python** : 0 erreur
- **Shell syntax smoke tests Phase 2→10** : 0 erreur
- **Commits** : Phase 9 (`423ec6a`), Phase 10 (`299c552`)
