# Roadmap DnD VTT

Dernière mise à jour : 2026-06-02

## ✅ Complétées — 45/45 phases

| # | Titre | Date |
|---|-------|------|
| 1-33 | Infra → Statistiques de session | 2026-05/06 |
| 34-38 | Plan UX (Correctifs → Polish) | 2026-06-02 |
| 39-43 | Contenu D&D enrichi | 2026-06-02 |
| 44 | Déploiement Render | 2026-06-02 |
| 45 | Nettoyage + Onglets + Panneaux flottants | 2026-06-02 |

### Détail Phases 39-43 — Contenu D&D enrichi

| # | Titre | Statut |
|---|-------|--------|
| 39 | 💀 Bestiaire (52 créatures SRD, API recherche, panel UI) | ✅ |
| 40 | ✨ Grimoire (25 sorts, API filtres, SpellbookPanel) | ✅ |
| 41 | 🗺️ Générateur de donjons (BSP algorithm, canvas preview) | ✅ |
| 42 | 🎒 Objets magiques & équipement (API items, ItemCompendium) | ✅ |
| 43 | 🧙 Création personnage assistée (wizard 4 étapes) | ✅ |

## 🚀 Phase 44 — Déploiement Render ✅

| Fichier | Action |
|---------|--------|
| `render.yaml` | Blueprint Render : backend Docker + frontend static |
| `App.tsx` | `API_BASE` dynamique via `VITE_API_URL` env var |
| `.node-version` | Pin Node 22.11.0 |

### Services Render
- **dnd-api** (Docker) — FastAPI + WebSocket, port 8000, health `/api/health`
- **dnd-frontend** (Static) — Vite SPA, rewrite SPA `/* → /index.html`
- **dnd-shared** (Env Group) — 9 variables partagées (DB, Redis, S3, secrets, CORS)

### Reste à faire
- Créer le groupe `dnd-shared` sur Render
- Connecter le blueprint au repo `Donopot/DnD`
- Configurer `VITE_API_URL` après 1er déploiement API
- Provisionner PostgreSQL + Redis + S3 externes
- 📋 Guide de déploiement complet : [docs/deployment.md](deployment.md)

## 🧹 Phase 45 — Nettoyage + Onglets + Panneaux flottants ✅

| Action | Détail |
|--------|--------|
| 🗑️ Nettoyage | 8 composants orphelins supprimés (−828 lignes) |
| 📑 Onglets | `CampaignViewTabs` : 7 onglets (Live, Journal, Prépa, Biblio, Campagne, Persos, Params) |
| 🪟 Flottants | 14/15 panneaux détachables (+9 : QuickActions, Messages, Journal, Stats, Donjons, Documents, Équipement, Homebrew, Règles) |
| 🎨 CSS | Styles onglets + ajustements panneaux |

### 14 panneaux flottants
Combat · Rencontres · Dés · Bestiaire · Grimoire · Actions rapides · Messages · Journal · Statistiques · Donjons · Documents · Équipement · Homebrew · Règles

### Panneaux par onglet
| Onglet | Panneaux |
|--------|----------|
| 🎯 Live | Combat, Rencontres, Dés, Actions rapides, Messages |
| 📋 Journal | Log session, Statistiques |
| 🗺️ Préparation | Donjons, Documents |
| 📚 Bibliothèque | Bestiaire, Grimoire, Équipement, Homebrew, Règles |
| 🏰 Campagne | Infos, Description, Membres |
| 👤 Personnages | Création assistée, Fiches, Inspecteur |
| ⚙️ Paramètres | (placeholder) |

## Métriques finales (après Phase 45)

- **Backend** : 106 endpoints, 17 routeurs, 22 migrations, 68+ schémas, 54 tests
- **Frontend** : 43 composants React, ~13 000 lignes CSS, 1778 modules Vite
- **Build** : 495ms, 356 kB (gzip 105 kB)
- **Contenu SRD** : 52 créatures, 25 sorts, 11 races, 12 classes, donjons procéduraux
- **Layouts** : 5 layouts distincts (Auth, GM 3-colonnes, Player map+panels, Lobby GM, Lobby Player)
- **Temps réel** : WebSocket 8 types de messages
- **Map** : snap-to-grid, zoom-cursor, nameplates, HP bars, grid toggle, fog undo, AoE, minimap, focus mode
- **Panneaux** : FloatingPanel (drag/resize/minimize), 11 sections sidebar, detach, hide-all
- **Combat** : tracker visuel, actions rapides, initiative, conditions, CR calculator
- **Outils MJ** : générateur rencontres, dés animés, macros, stats, rules reference, bestiaire, grimoire, donjons
- **Outils Joueur** : onglets, dés rapides, ping/ruler, notifications combat, markdown handouts
- **UX** : thème dark/light, skeletons, toasts, resize handles, focus map, raccourcis clavier
- **Maintenance** : 3 cron jobs (backup 03h, audit 06h, suggestions 07h30)
