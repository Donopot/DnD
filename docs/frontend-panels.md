# Documentation des panneaux GM

> Généré le 2026-06-02 — PANEL-1 → PANEL-4

## Registre unique

Le fichier `frontend/src/config/gmPanels.ts` est la **source de vérité** pour tous les panneaux de l'interface Maître du Jeu.

Tout panneau doit y être déclaré avec :
- `id` — identifiant unique (kebab-case)
- `label` — nom affiché en français
- `emoji` — icône
- `category` — onglet de rattachement
- `status` — `active` (implémenté) ou `planned` (à faire)
- `detachable` — peut être ouvert en fenêtre flottante

## Inventaire

### Onglet Session Live (`live`)

| ID | Label | Statut |
|----|-------|--------|
| `combat` | ⚔️ Combat | active |
| `encounter-builder` | 🧩 Générateur de rencontres | active |
| `dice-roller` | 🎲 Lancer de dés | active |
| `quick-actions` | ⚡ Actions rapides | active |
| `gm-messages` | 💬 Communication | active |
| `gm-notes` | 📝 Notes MJ | active |
| `initiative` | ⏱️ Initiative | active |
| `token-detail` | 🔍 Détail token | active |
| `visibility-inspector` | 👁️ Visibilité | active |
| `ambiance` | 🎵 Ambiance | planned |
| `chat` | 💭 Chat en direct | planned |

### Onglet Préparation (`preparation`)

| ID | Label | Statut |
|----|-------|--------|
| `dungeon-generator` | 🗺️ Générateur de donjons | active |
| `handouts` | 📄 Documents | active |
| `scene` | 🎬 Scènes | planned |
| `tokens` | 🎭 Tokens | planned |

### Onglet Journal (`journal`)

| ID | Label | Statut |
|----|-------|--------|
| `session-log` | 📋 Journal | active |
| `session-stats` | 📊 Statistiques | active |

### Onglet Bibliothèque (`library`)

| ID | Label | Statut |
|----|-------|--------|
| `bestiary` | 💀 Bestiaire | active |
| `spellbook` | ✨ Grimoire | active |
| `items` | 🎒 Équipement | active |
| `homebrew` | 📚 Bibliothèque | active |
| `rules` | 📖 Règles (SRD) | active |
| `npc-generator` | 🧑 Générateur PNJ | planned |

### Onglet Personnages (`characters`)

| ID | Label | Statut |
|----|-------|--------|
| `characters` | 👤 Personnages | active |
| `party-summary` | 📊 Résumé du groupe | active |

### Onglet Campagne (`campaign`)

| ID | Label | Statut |
|----|-------|--------|
| `campaign-info` | 📋 Infos campagne | active |

## Mapping IDs legacy → standard

| Ancien (App.tsx) | Nouveau (gmPanels.ts) | Migré ? |
|-------------------|------------------------|---------|
| `quickactions` | `quick-actions` | ✅ PANEL-2 |
| `sessionlog` | `session-log` | ✅ PANEL-2 |
| `dice` | `dice-roller` | ✅ PANEL-2 |
| `encounter` | `encounter-builder` | ✅ PANEL-2 |
| `messages` | `gm-messages` | ✅ PANEL-2 |
| `dungeon` | `dungeon-generator` | ✅ PANEL-2 |
| `stats` | `session-stats` | ✅ PANEL-2 |

## Modes de session live

Définis dans `frontend/src/config/sessionLiveModes.ts` (source unique).

Chaque mode filtre les panneaux visibles dans la sidebar via `SESSION_LIVE_PANEL_SETS` :

| Mode | Panneaux visibles | Description |
|------|-------------------|-------------|
| `exploration` | 21 panneaux | Tous les panneaux actifs |
| `combat` | 13 panneaux | Combat, initiative, dés, actions, visibilité |
| `roleplay` | 13 panneaux | Notes, messages, handouts, personnages |
| `quick-prep` | 14 panneaux | Donjons, bestiaire, sorts, équipement |
| `minimal` | 6 panneaux | Combat, dés, token, journal, messages |

## Script de vérification

```bash
bash scripts/check-gm-panels-current.sh
```

Vérifie :
1. Tous les panneaux `active` sont présents dans `App.tsx`
2. Aucun ID dupliqué dans le registre
3. Cohérence `fp.open()` ↔ `panel.id` (floating panels)
4. Aucun script legacy ne référence `VttBoard.tsx`
5. `gmPanels.ts` est l'unique registre

## Roadmap

| Sprint | Objectif | Statut |
|--------|----------|--------|
| PANEL-1 | Registre unique + check script + doc | ✅ |
| PANEL-2 | Normalisation des IDs dans App.tsx (7 mappings) | ✅ |
| PANEL-3 | Réintégration 5 panneaux planned → active | ✅ |
| PANEL-4 | Branchement modes Session Live (21 filtres) | ✅ |
| PANEL-5 | Nettoyage legacy (useFloatingWidgets, VttBoard, 12 scripts) | ✅ |

## PANEL-5 — Détail du nettoyage

### Suppressions

| Fichier | Raison |
|---------|--------|
| `frontend/src/components/QuickActionsPanel.tsx` | Composant orphelin (jamais importé dans App.tsx) |
| `frontend/src/hooks/useFloatingWidgets.ts` | Remplacé par `useFloatingPanels` (fp.open) |
| `frontend/src/config/vttPanels.ts` | Wrapper legacy sans consommateur |
| `scripts/audit-gm-panels-complete.sh` | Référençait VttBoard.tsx (inexistant) |
| `scripts/check-gm-interface-clean.sh` | idem |
| `scripts/check-gm-notes-api.sh` | idem |
| `scripts/check-gm-notes-panel.sh` | idem |
| `scripts/check-gm-panels-standard-layout.sh` | idem |
| `scripts/check-panel-interactions.sh` | idem |
| `scripts/check-panel-system.sh` | idem |
| `scripts/check-party-summary-panel.sh` | idem |
| `scripts/check-quick-actions-panel.sh` | idem |
| `scripts/check-vtt-panels.sh` | idem |

### Migrations

| Composant | Changement |
|-----------|-----------|
| `VisibilityInspectorPanel` | `showFloatingWidget()` → callback `onOpenPanel` injecté depuis App.tsx |
| `sessionLiveModes.ts` | Suppression `FloatingWidgetPreset` + `getPresetForSessionLiveMode()` (code mort) |

### Scripts conservés

| Script | Rôle |
|--------|------|
| `check-gm-panels-current.sh` | Vérification cohérence registre ↔ App.tsx |
| `check-gm-panel-css.sh` | Vérification CSS des panneaux |
