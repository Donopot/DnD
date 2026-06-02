# Roadmap DnD VTT

Dernière mise à jour : 2026-06-02

## ✅ Complétées — 43/43 phases

| # | Titre | Date |
|---|-------|------|
| 1-33 | Infra → Statistiques de session | 2026-05/06 |
| 34-38 | Plan UX (Correctifs → Polish) | 2026-06-02 |
| 39-43 | Contenu D&D enrichi | 2026-06-02 |

### Détail Phases 39-43 — Contenu D&D enrichi

| # | Titre | Statut |
|---|-------|--------|
| 39 | 💀 Bestiaire (52 créatures SRD, API recherche, panel UI) | ✅ |
| 40 | ✨ Grimoire (25 sorts, API filtres, SpellbookPanel) | ✅ |
| 41 | 🗺️ Générateur de donjons (BSP algorithm, canvas preview) | ✅ |
| 42 | 🎒 Objets magiques & équipement (API items, ItemCompendium) | ✅ |
| 43 | 🧙 Création personnage assistée (wizard 4 étapes) | ✅ |

## Métriques finales

- **Backend** : 106 endpoints, 17 routeurs, 22 migrations, 68+ schémas, 54 tests
- **Frontend** : 50+ composants React, ~13 000 lignes CSS, 1800+ modules Vite
- **Contenu SRD** : 52 créatures, 25 sorts, 11 races, 12 classes, donjons procéduraux
- **Build** : 432ms, 351 kB (gzip 105 kB)
- **Layouts** : 5 layouts distincts (Auth, GM 3-colonnes, Player map+panels, Lobby GM, Lobby Player)
- **Temps réel** : WebSocket 8 types de messages
- **Map** : snap-to-grid, zoom-cursor, nameplates, HP bars, grid toggle, fog undo, AoE, minimap, focus mode
- **Panneaux** : FloatingPanel (drag/resize/minimize), 11 sections sidebar, detach, hide-all
- **Combat** : tracker visuel, actions rapides, initiative, conditions, CR calculator
- **Outils MJ** : générateur rencontres, dés animés, macros, stats, rules reference, bestiaire, grimoire, donjons
- **Outils Joueur** : onglets, dés rapides, ping/ruler, notifications combat, markdown handouts
- **UX** : thème dark/light, skeletons, toasts, resize handles, focus map, raccourcis clavier
- **Maintenance** : 3 cron jobs (backup 03h, audit 06h, suggestions 07h30)
