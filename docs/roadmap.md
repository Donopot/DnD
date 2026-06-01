# Roadmap DnD VTT

Dernière mise à jour : 2026-06-01

## ✅ Complétées (Phases 1–28)

| # | Titre | Date |
|---|-------|------|
| 1 | Infra (Docker, réseau isolé) | 2026-05 |
| 2 | Auth + Campagnes | 2026-05 |
| 3 | Fiches personnages | 2026-05 |
| 4 | Dés + Journal | 2026-05 |
| 5 | WebSocket temps réel | 2026-05 |
| 6 | Tokens + Scènes | 2026-05 |
| 7 | Combat (initiative, tours) | 2026-05 |
| 8 | Assets (upload cartes) | 2026-05 |
| 9 | Homebrew (créatures, objets) | 2026-06 |
| 10 | Handouts (documents partagés) | 2026-06 |
| 11 | Initiative Tracker | 2026-06 |
| 12 | Visibilité (contrôle tokens) | 2026-06 |
| 13 | Fiche éditable | 2026-06 |
| 14 | Interface Joueur | 2026-06 |
| 15 | Journal structuré | 2026-06 |
| 16 | Fog of War | 2026-06 |
| 17 | Auth GM/Joueur distinct | 2026-06 |
| 18 | Interactions Joueur | 2026-06 |
| 19 | Refonte Auth & 4 Layouts | 2026-06 |
| 20 | Refonte Totale Interfaces + Vault Persos | 2026-06 |
| 21 | Communication MJ↔Joueur | 2026-06 |
| 22 | Map interactive joueur | 2026-06 |
| 23 | Gestion perso par le MJ | 2026-06 |
| 24 | Mesures et gabarits AoE | 2026-06 |
| 25 | SRD et règles de base | 2026-06 |
| 26 | Sauvegardes et maintenance | 2026-06 |
| 27 | Beta privée (polish final) | 2026-06 |
| 28 | 🔥 Upgrade total de la Map (review + snap-grid + nameplates + zoom-cursor + grid toggle + fog undo) | 2026-06 |

## 🔜 Prochaines phases

| # | Titre | Priorité | Estimation |
|---|-------|----------|------------|
| 29 | Système de combat complet (tours, rounds, initiative visuelle, actions) | Haute | 3 jours |
| 30 | Générateur de rencontres (CR calculator, random encounters) | Moyenne | 2 jours |
| 31 | Lancer de dés public avec effets visuels (animations 3D dés) | Moyenne | 3 jours |
| 32 | Système de macros et raccourcis (barre d'actions personnalisable) | Basse | 2 jours |
| 33 | Logs et analytics (audit des actions, stats de session) | Basse | 2 jours |

## Métriques actuelles

- **Backend** : 100 endpoints, 12 routeurs, 19 migrations, 66 schémas, 49 tests unitaires
- **Frontend** : 39 composants React, ~11 200 lignes CSS, 1760 modules Vite
- **Layouts** : 5 layouts distincts
- **Temps réel** : WebSocket 8 types de messages (présence, scène, tokens, handouts, combat, ping, règle/drag/AoE)
- **Map** : snap-to-grid, zoom-cursor, nameplates, HP bars, grid toggle, fog undo, AoE shapes
- **Maintenance** : 3 cron jobs (backup 03h, audit 06h, suggestions 07h30)
