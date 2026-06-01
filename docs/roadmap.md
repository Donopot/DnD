# Roadmap DnD VTT

Dernière mise à jour : 2026-06-01

## ✅ Complétées (Phases 1–20)

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

## 🔜 Prochaines

| # | Titre | Priorité | Estimation |
|---|-------|----------|------------|
| 21 | Communication MJ↔Joueur (jet secret, annonces, msgs privés) | Haute | 2 jours |
| 22 | Map interactive joueur (ping, déplacement token, mesure) | Haute | 3 jours |
| 23 | Gestion perso par le MJ (items, XP, conditions) | Moyenne | 3 jours |
| 24 | Mesures et gabarits (distance, AoE) | Moyenne | 2 jours |
| 25 | SRD et règles de base | Basse | 2 jours |
| 26 | Sauvegardes et maintenance | Moyenne | 2 jours |
| 27 | Beta privée | Haute | 3 jours |

## Métriques actuelles

- **Backend** : 88 endpoints, 11 routeurs, 17 migrations, 57 schémas, 42 tests
- **Frontend** : 33 composants React, ~10244 lignes CSS, 1765 modules Vite
- **Layouts** : AuthPage, PlayerLobby, GMLobby, GM Campaign (3 colonnes), Player Campaign (map+panneaux)
- **Temps réel** : WebSocket scène/tokens/handouts/combat
