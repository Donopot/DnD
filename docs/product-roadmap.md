# Roadmap Produit — DnD VTT / SaaS

Dernière mise à jour : 2026-06-07

---

## 1. Vision produit

L'objectif du projet est de construire un VTT auto-hébergé, fiable, rapide et adapté à une vraie table de jeu de rôle.

Le produit doit permettre :

- au MJ de préparer une campagne ;
- de lancer une session en direct ;
- de gérer scènes, cartes, tokens, combats, notes et secrets ;
- aux joueurs de rejoindre une interface simple et claire ;
- de séparer strictement ce que voit le MJ et ce que voient les joueurs ;
- de conserver une expérience fluide même sur une machine modeste.

La priorité n'est pas d'ajouter un maximum de boutons. La priorité est de **réduire la charge mentale du MJ**.

Chaque fonctionnalité doit répondre à au moins un de ces objectifs :

- accélérer une action fréquente ;
- éviter une erreur ;
- protéger une information secrète ;
- rendre le combat plus fluide ;
- soutenir l'improvisation ;
- améliorer l'immersion ;
- simplifier l'interface joueur.

### Positionnement technique

`dnd-saas` est le dépôt full-stack du produit. Il contient : frontend React/Vite, backend FastAPI, migrations PostgreSQL, stockage MinIO/S3, temps réel WebSocket, scripts de smoke test, documentation, et configuration Docker pour le HP Mini.

Le HP Mini héberge le produit complet (frontend, backend, base de données, stockage, reverse proxy, scripts de maintenance). Le dépôt doit rester déployable en une commande :

```bash
docker compose up -d --build
```

---

## 2. Architecture & Principes

### 2.1 Principe fondamental

**Le backend est la source de vérité des données.** Le frontend est le client produit principal mais ne doit pas devenir une source de vérité durable.

À éviter :

- données métier uniquement en localStorage ;
- logique de permission uniquement frontend ;
- règles métier dupliquées sans validation backend ;
- fonctionnalités UI non couvertes par API ou smoke test.

### 2.2 Principes UX obligatoires

#### Carte dominante

En session live, la carte doit occuper la majorité de l'écran (75% à 85%). Aucun formulaire long en mode Partie, outils avancés masqués ou repliés, mini-map et inspecteur compacts.

#### Trois modes MJ

| Mode | Usage | Visible | Masqué |
|------|-------|---------|--------|
| **Partie** | Session live (défaut) | Carte, cockpit MJ compact, mini-map, inspecteur, actions rapides, journal court, combat compact | Création scène, upload carte, liste tokens longue, formulaires longs |
| **Préparation** | Avant session | Scènes, assets, upload carte, création token, liste tokens, notes de scène, préparation combat | — |
| **Avancé** | Expert | Panneaux flottants, presets, layout personnalisé, reset, verrouillage/réduction/fermeture | — |

#### Interface joueur séparée

Le joueur voit : carte joueur, son personnage, PV/CA/ressources, bouton lancer dé, journal public, état combat, son tour si actif.

Le joueur ne voit pas : upload carte, création scène, outils MJ, secrets, panneaux libres MJ, notes MJ, PNJ/tokens cachés, fog non révélé.

#### Visibilité explicite

Tout contenu doit avoir un statut clair : MJ uniquement, visible par tous, visible par un joueur, visible par un groupe, prêt à révéler, archivé. Aucun contenu secret ne doit être ambigu.

#### Actions fréquentes en un clic

Lancer dé, ajouter token, centrer carte/token, ping, mesurer, ajouter note, tour suivant, appliquer dégâts, cacher/révéler token, ouvrir aperçu joueur.

### 2.3 Structure de l'interface MJ

L'interface GM est organisée autour de deux niveaux :

- **les onglets** : grands espaces de travail (Live, Journal, Préparation, Bibliothèque, Campagne, Personnages, Paramètres) ;
- **les panneaux** : outils contextuels du MJ (14 panneaux flottants standardisés).

L'onglet **Session Live** est le cockpit principal : carte de session, modes, menu Panneaux, panneaux standardisés, dock des panneaux fermés/réduits, actions rapides.

#### Répartition des panneaux par onglet

| Onglet | Panneaux |
|--------|----------|
| 🎯 Live | Combat, Rencontres, Dés, Actions rapides, Messages |
| 📋 Journal | Log session, Statistiques |
| 🗺️ Préparation | Donjons, Documents |
| 📚 Bibliothèque | Bestiaire, Grimoire, Équipement, Homebrew, Règles |
| 🏰 Campagne | Infos, Description, Membres |
| 👤 Personnages | Création assistée, Fiches, Inspecteur |
| ⚙️ Paramètres | (placeholder) |

#### Socle technique des panneaux

Chaque panneau doit respecter : `data-vtt-panel`, `data-floating-widget`, `data-floating-title`, un seul header runtime, boutons standards, dock/réduction/fermeture/épinglage/verrouillage/redimensionnement compatibles, classes CSS communes (`gm-panel-content`, `gm-panel-section`, `gm-panel-context`, etc.).

---

## 3. Travail complété — Phases 1 à 64

### 3.1 Phases 1-38 — Fondations, UX, Correctifs

| # | Titre | Date |
|---|-------|------|
| 1-33 | Infra → Statistiques de session | 2026-05/06 |
| 34-38 | Plan UX (Correctifs → Polish) | 2026-06-02 |

Le socle technique construit comprend : backend FastAPI, PostgreSQL, MinIO, Redis, frontend React/Vite, Docker Compose, authentification, campagnes, personnages, jets de dés, journal de session, WebSocket temps réel, scènes VTT, tokens, assets de carte, combat minimal, carte (drag token, snap, zoom, pan, mini-map), interface MJ nettoyée avec modes Partie/Préparation/Avancé, panneaux flottants déplaçables/redimensionnables, presets de panneaux, layout personnalisé sauvegardable.

### 3.2 Phases 39-43 — Contenu D&D enrichi ✅

| # | Titre | Détail |
|---|-------|--------|
| 39 | 💀 Bestiaire | 52 créatures SRD, API recherche, panel UI |
| 40 | ✨ Grimoire | 25 sorts, API filtres, SpellbookPanel |
| 41 | 🗺️ Générateur de donjons | BSP algorithm, canvas preview |
| 42 | 🎒 Objets magiques & équipement | API items, ItemCompendium |
| 43 | 🧙 Création personnage assistée | Wizard 4 étapes |

### 3.3 Phase 44 — Déploiement Render ✅

| Fichier | Action |
|---------|--------|
| `render.yaml` | Blueprint Render : backend Docker + frontend static |
| `App.tsx` | `API_BASE` dynamique via `VITE_API_URL` env var |
| `.node-version` | Pin Node 22.11.0 |

Services Render : **dnd-api** (Docker, FastAPI + WebSocket, port 8000), **dnd-frontend** (Static, Vite SPA), **dnd-shared** (Env Group, 9 variables : DB, Redis, S3, secrets, CORS).

### 3.4 Phase 45 — Nettoyage + Onglets + Panneaux flottants ✅

| Action | Détail |
|--------|--------|
| 🗑️ Nettoyage | 8 composants orphelins supprimés (−828 lignes) |
| 📑 Onglets | `CampaignViewTabs` : 7 onglets (Live, Journal, Prépa, Biblio, Campagne, Persos, Params) |
| 🪟 Flottants | 14/15 panneaux détachables |
| 🎨 CSS | Styles onglets + ajustements panneaux |

### 3.5 Phases 46-49 — Immersion & Social ✅

| # | Titre | Statut |
|---|-------|--------|
| 46 | 🎧 Ambiance audio (9 playlists, contrôle volume, synthé brown noise) | ✅ |
| 47 | Réservé — brouillard de guerre dynamique | 🔜 |
| 48 | 🌦️ Météo & Atmosphère (pluie, neige, brouillard, nuit — canvas animé) | ✅ |
| 49 | 🧙 Générateur de PNJ (noms, apparence, personnalité, secrets — tables FR) | ✅ |

### 3.6 Phases 53-59 — Outils MJ & Social ✅

| # | Titre | Statut |
|---|-------|--------|
| 53 | 💬 Chat de campagne (IC/OOC/whispers, dés rapides, WebSocket) | ✅ |
| 59 | 🏷️ États visuels sur tokens (20 conditions, badges emoji, max 4 affichés) | ✅ |

### 3.7 Phases 60-64 — Audit UX : Corrections ✅

| # | Titre | Statut |
|---|-------|--------|
| 60 | 🎨 Thème fonctionnel (23 CSS variables, 407 `var()` usages, light/dark) | ✅ |
| 61 | 🧹 Nettoyage CSS dupliqué (analyse, bloc orphelin identifié) | ✅ |
| 62 | ⌨️ Navigation clavier (Escape modales, `role=dialog`, `aria-modal`) | ✅ |
| 63 | ⏳ InlineSpinner + ErrorBoundary (composants prêts) | ✅ |
| 64 | 🛡️ Error boundaries wrapper (panels, map) | ✅ |
| 65 | ⚔️ GM-2E — Initiative stable (backend combat intégré, start/next-turn/end, KO) | ✅ |
| 66 | ⚡ GM-2F — Actions rapides (CSS scopé, dés rapides d4-d100) | ✅ |
| 67 | 👁️ GM-2G — Visibilité (CSS scopé, fix sélecteur .visibility-alerts) | ✅ |
| 68 | 📚 GM-3A — Bibliothèque tokens (templates, favoris, recherche, ajout scène) | ✅ |
| 69 | 📄 GM-3B — Documents révélables (refactor CSS, historique révélations) | ✅ |
| 70 | 🏷️ GM-3C — États / conditions (durée tours, decrement, badges couleur) | ✅ |
| 71 | ⚔️ GM-3D — Rencontre active (objectifs, conditions victoire, loot, switch combat) | ✅ |

---

## 4. État actuel (Juin 2026)

### 4.1 Métriques finales

**Backend :**
- 118 endpoints, 18 routeurs, 26 migrations, 72 schémas, 122 tests

**Frontend :**
- 55 composants React, ~10 800 lignes CSS, 1798 modules Vite
- Build : ~700ms, 433 kB (gzip 128 kB)

**Contenu SRD :**
- 52 créatures, 25 sorts, 11 races, 12 classes, donjons procéduraux

**Fonctionnalités clés :**
- 5 layouts distincts (Auth, GM 3-colonnes, Player map+panels, Lobby GM, Lobby Player)
- WebSocket 8 types de messages
- Map : snap-to-grid, zoom-cursor, nameplates, HP bars, grid toggle, fog undo, AoE, minimap, focus mode
- Panneaux : FloatingPanel (drag/resize/minimize), 11 sections sidebar, detach, hide-all
- Combat : tracker visuel, actions rapides, initiative, conditions, CR calculator
- Outils MJ : générateur rencontres, dés animés, macros, stats, rules reference, bestiaire, grimoire, donjons
- Outils Joueur : onglets, dés rapides, ping/ruler, notifications combat, markdown handouts
- UX : thème dark/light, skeletons, toasts, resize handles, focus map, raccourcis clavier
- Maintenance : 3 cron jobs (backup 03h, audit 06h, suggestions 07h30)

### 4.2 Forces

- Socle technique cohérent
- Principales briques VTT existent
- Backend structuré par phases, smoke tests couvrants
- Carte utilisable, interface MJ séparée en modes
- Panneaux libres donnant une base d'ergonomie avancée

### 4.3 Faiblesses à adresser

- ~~Pas de véritable interface joueur dédiée~~ → PlayerView + PlayerWorkspace (Phase 14)
- ~~Pas de visibilité MJ/joueur fine~~ → VisibilityInspectorPanel + GmSettingsPanel (Phase 12, PR #108)
- ~~Pas de brouillard de guerre~~ → Fog of War avec zones, cercle/rect, auto-révélation (Phase 16+39)
- ~~Pas d'aperçu joueur ni de mode focus carte complet~~ → focus mode Escape/F, minimap toggle (v0.12.1)
- ~~Gestion des tokens~~ → supprimer, dupliquer, éditer, z-index, groupes, menu clic droit (PR #62-65)
- ~~Panneaux flottants instables~~ → pinned/locked/maximized, presets nommés (v0.12.1)
- Pas de notes de scène avancées
- Pas de PNJ/factions
- Pas de moteur combat avancé
- Pas de sauvegarde de layout par campagne/scène

---

## 5. Roadmap future

### 5.1 Priorisation

#### Priorité immédiate

1. **Finaliser panneaux MJ** : ~~presets toujours accessibles, preset personnalisé, dock panneaux réduits, épingler/détacher, focus carte~~ → ✅ v0.12.1 (floating panels v2 + focus map/mini-map)
2. **Gestion tokens** : ~~supprimer, dupliquer, éditer, cacher/révéler, verrouiller, menu clic droit~~ → ✅ PR #62-65 (TokenContextMenu, z-index, groupes)
3. **Interface joueur simplifiée** : route joueur dédiée, carte filtrée, fiche compacte, dés joueur, journal public → 🔜 PR #6 (en cours)
4. **Polish design system** : tooltips, contraste, palette cohérente → 🔜 PR #7 (en cours)

#### Priorité moyenne

4. Visibilité et aperçu joueur
5. Fog manuel MVP
6. Mesures, ping, annotations
7. Combat avancé
8. Notes de scène

#### Priorité longue

9. PNJ/factions
10. Handouts/immersion
11. Performance/accessibilité
12. Multi-écrans
13. Assistant MJ
14. Export/import/compendium

### 5.2 Développement GM — Stabilisation (Étape 0) ✅

L'étape 0 (stabilisation de l'interface GM) est terminée :

| Sous-étape | Objectif | Statut |
|------------|----------|--------|
| 0A — Clean Session Live | Retirer Table/Combat/Journal de Session Live, renommer Table virtuelle en Carte de session | ✅ |
| 0B — Standardisation panneaux | Registre unique, menu Panneaux basé registre, suppression data-quick-panel, dock, boutons standards | ✅ |
| 0C — Consolidation visuelle | Lisibilité, éviter doubles headers, dock amélioré, éviter panneaux hors écran | ✅ |
| 0D — Validation finale | Build TypeScript/Docker OK, health backend OK, test navigateur, merge/tag | ✅ |

### 5.3 Développement GM — Socle CSS et panneaux existants (Étapes 1-2) ✅

**GM-2D-CSS — CSS commun panneaux GM** : centraliser le style commun, refactoriser Notes MJ et Résumé du groupe, script de vérification CSS.

**Panneaux à finaliser avec CSS commun :**

| Panneau | Objectif |
|---------|----------|
| Notes MJ (GM-2C) | Notes privées par scène, sauvegarde localStorage, copie, vider, contexte scène/token |
| Résumé du groupe (GM-2D) | PV, CA, vitesse, perception passive, statut OK/Blessé/Critique/KO |
| Initiative stable (GM-2E) | Round actuel, combattant actif, ordre de tour, démarrer/terminer combat, CSS commun |
| Actions rapides (GM-2F) | Panneau compact, boutons panneaux/layouts, dés rapides, utilitaires session |
| Visibilité (GM-2G) | Inspecteur visibilité, token visible/caché, état MJ vs joueurs, rappel anti-erreur |

### 5.4 Nouveaux panneaux GM (Étape 3) ✅

| Panneau | Objectif |
|---------|----------|
| Bibliothèque tokens (GM-3A) | Liste tokens réutilisables, recherche, favoris, derniers utilisés, ajout rapide sur carte |
| Documents révélables (GM-3B) | Documents privés MJ, visibles joueurs, bouton révéler, historique des révélations |
| États / conditions (GM-3C) | États actifs, durée, rappel début/fin de tour, liaison avec combat |
| Rencontre active (GM-3D) | Ennemis prévus/révélés, objectifs, conditions de victoire, loot prévu |

### 5.5 Gestion avancée des tokens (Étape 4 — Phase 11)

**Backend token actions :**
- DELETE `/api/tokens/{token_id}`, POST `/api/tokens/{token_id}/duplicate`, PATCH `/api/tokens/{token_id}`
- POST `/api/tokens/{token_id}/bring-forward`, POST `/api/tokens/{token_id}/send-backward`
- Changement nom, couleur, taille, position, visibilité, verrouillage, z-index, liaison personnage

**Frontend token :**
- Inspecteur token éditable (nom, couleur, taille, x/y, visible/caché, verrouillé, hostile/neutre/allié)
- Actions rapides (centrer, dupliquer, supprimer, masquer, révéler, ajouter/retirer combat, envoyer devant/derrière, reset position, verrouiller)
- Menu contextuel clic droit (actions rapides, raccourcis clavier)
- Groupes de tokens (sélection multiple, déplacement/duplication/suppression groupe, initiative groupe ennemis, nommage automatique Gobelin 1, Gobelin 2)

### 5.6 Interface joueur (Phase 12)

- **Route/vue joueur** : vue séparée, détection rôle campagne, redirection adaptée, layout minimal
- **Carte joueur** : afficher uniquement scène active, fond visible, tokens visibles, pas de drag MJ, zoom/pan joueur
- **Fiche joueur compacte** : PV, CA, vitesse, niveau, classe, ressources, attaques rapides, jets fréquents
- **Dés joueur** : lancer d20, formule, attaque, sauvegarde, compétence, visible public/privé MJ, historique
- **Journal public** : messages publics, jets publics, révélations, début/fin combat, notes publiques
- **Tour joueur** : indication « c'est ton tour », actions disponibles, bouton fin de tour, réactions, états actifs

### 5.7 Visibilité, secrets et aperçu joueur (Phase 13)

- **Mode aperçu joueur** : bouton dans cockpit, mini-fenêtre de ce que voient les joueurs, scène/tokens visibles, masquer infos MJ
- **Badges de visibilité** : MJ, Tous, Joueur, Groupe, Prêt à révéler, Archive — appliqués à tokens, notes, handouts, scènes, assets, PNJ, journal
- **Historique des révélations** : qui a vu quoi, quand, quel MJ/action, annuler révélation si possible, journal audit
- **Mode panique** : raccourci clavier, masquer tout secret, fermer panneaux MJ, revenir vue safe (utile partage écran)

### 5.8 Brouillard de guerre et calques MJ (Phase 14)

- **Fog manuel MVP** : tout cacher/révéler, révéler rectangle/cercle, masquer zone, sauvegarder fog par scène
- **Calque MJ** : pièges, secrets, notes MJ, DC, spawn, zones dangereuses, portes cachées
- **Outils de révélation** : pinceau révélation, gomme fog, opacité fog, aperçu joueur, historique zones révélées
- **Fog par joueur** (ultérieur) : vision individuelle, zones vues par personnage, partage vision groupe, brouillard exploré mais non visible

### 5.9 Annotations, mesures et gabarits (Phase 15)

- **Mesure de distance** : outil règle, distance en cases/mètres/pieds, diagonales configurables, mesure temporaire
- **Ping** : ping MJ/joueur, visible tous ou privé MJ, animation légère
- **Dessin rapide** : trait libre, flèche, texte, effacer, couleur, visible MJ ou public
- **Gabarits de sorts** : cercle, cône, ligne, rectangle, aura — taille configurable, rotation, couleur, ciblage tokens touchés

### 5.10 Combat avancé (Phase 16)

- **Tracker initiative avancé** : ordre clair, round, tour actif, prochain joueur, ennemis groupés, initiative cachée, retard, prêt
- **Tour suivant intelligent** : expiration effets, rappel concentration, reaction reset, alerte joueur inactif, log automatique
- **PV et dégâts** : appliquer dégâts, soigner, dégâts groupés, résistance/vulnérabilité/immunité, annuler dernier changement
- **États combat** : ajouter état, durée, source, expiration, rappel, immunité, visibilité joueur
- **Fin de combat** : XP, butin, nettoyer états, corps/prisonniers/fuite, résumé combat, conséquences

### 5.11 Notes, scénario et mémoire de campagne (Phase 17)

- **Notes rapides** : champ note rapide, lien automatique scène/token, horodatage, tag rapide, visibilité MJ
- **Notes de scène** : objectif scène, secrets, indices, dangers, PNJ présents, ambiance, transitions
- **Journal d'indices** : statuts (prévu, donné, compris, ignoré, mal interprété, confirmé, résolu)
- **Chronologie** : événements monde/session, promesses, dettes narratives, conséquences
- **Recherche globale** : dans notes, PNJ, scènes, joueurs, factions, objets, règles maison

### 5.12 PNJ, créatures et factions (Phase 18)

- **PNJ compact** : nom, portrait, voix, motivation, peur, faction, attitude, secrets, scènes liées, dernière apparition — actions : ajouter à scène/combat, révéler portrait, note rapide, changer attitude
- **Créatures** : statblock, PV, CA, attaques, traits, résistances, faiblesses, tactique, moral, butin
- **Factions** : objectifs, ressources, territoire, alliés, ennemis, horloges, réputation groupe
- **Relations** : relation PNJ/joueur, faction/faction, graph simple, tags, historique interactions

### 5.13 Immersion, handouts et ambiance (Phase 19)

- **Handouts** : upload image/document, preview MJ, révéler à tous/joueur, retirer, historique révélation
- **Packs de scène** : carte, musique, ambiance, description, PNJ, handouts, secrets, fog, notes — activer en un clic
- **Ambiance audio** : playlist scène, effet ponctuel, volume, boucle, fondu, stop global
- **Révélation dramatique** : texte court, image, zoom carte, son, fondu, visible joueurs

### 5.14 Performance, accessibilité et stabilité (Phase 20)

- **Préchargement assets** : précharger scène suivante, statut assets chargés, miniatures, basse résolution
- **Mode connexion faible** : désactiver animations, images basse résolution, file d'attente actions, reconnexion automatique, indicateur offline
- **Autosave et annulation** : autosave layout/notes, historique actions, annuler dernier changement, restauration crash
- **Accessibilité** : contraste élevé, police ajustable, réduction animations, navigation clavier, tooltips, zones cliquables plus grandes

### 5.15 Multi-écrans (Phase 21)

- Vue MJ principale (cockpit complet)
- Vue joueur (carte + personnage + dés)
- Vue projecteur (carte publique + images révélées)
- Vue tablette MJ (notes, PNJ, dés, combat rapide)
- Fenêtre aperçu joueur (mini preview dans cockpit MJ)

### 5.16 Assistant MJ et automatisations (Phase 22)

- **Assistant préparation** : checklist session, scènes incomplètes, PNJ incomplets, combats non préparés, arcs ouverts
- **Assistant improvisation** : générateurs nom PNJ, rumeur, taverne, objet, rencontre, météo, conséquence
- **Assistant rythme** : combat trop long, joueur inactif, indice non donné, tension faible, pause recommandée
- **Assistant après-session** : résumé session, décisions, XP, butin, conséquences, tâches MJ, message récap joueurs

### 5.17 Données, export et extensibilité (Phase 23)

- **Export campagne** : JSON, Markdown, ZIP assets, personnages, scènes, notes, logs
- **Import** : personnages, cartes, notes, tokens, mapping champs
- **Compendium** : monstres, sorts, objets, règles, tables aléatoires, macros
- **Règles maison** : champs dynamiques, formules, statblocks custom, systèmes personnalisables
- **API et webhooks** : webhooks, exports automatisés, intégrations bots, sauvegardes externes

### 5.18 Calendrier des releases

| Version | Thème | Contenu clé |
|---------|-------|-------------|
| **v0.10.x** | Interface MJ | Interface propre, panneaux utilisables, presets, layout personnalisé, focus carte |
| **v0.11.x** | Tokens avancés | Édition, suppression, duplication, visibilité, verrouillage, menu contextuel |
| **v0.12.x** | Refonte UX MJ ✅ | ~~App.tsx, contexts, hooks, API centralisation, panneaux flottants v2, focus map/mini-map, GM overrides~~ → Livré (06/2026) |
| **v0.13.x** | Interface joueur | Vue joueur simplifiée, carte joueur, fiche compacte, dés, journal public |
| **v0.14.x** | Visibilité et secrets | Badges, aperçu joueur, historique révélations, mode panique |
| **v0.14.x** | Fog et calques MJ | Fog manuel, calques, zones cachées, aperçu joueur |
| **v0.15.x** | Outils carte | Mesures, ping, dessin, gabarits |
| **v0.16.x** | Combat avancé | Tracker complet, effets, dégâts, fin de combat |
| **v0.17.x** | Notes et mémoire | Notes rapides, indices, chronologie, recherche |
| **v0.18.x** | PNJ, créatures, factions | Base narrative, relations, factions, créatures |
| **v0.19.x** | Immersion | Handouts, audio, packs scène, révélations dramatiques |
| **v0.20.x** | Stabilité et performance | Préchargement, connexion faible, autosave, accessibilité |

---

## 6. Règles de développement

### 6.1 Règles backend

Chaque évolution backend doit avoir :

- migration SQL dédiée si nécessaire ;
- schémas Pydantic ;
- router ou endpoint cohérent ;
- permissions par rôle ;
- smoke test ;
- documentation ;
- validation Docker.

Respecter : architecture FastAPI existante, routes existantes, permissions (MJ, co-MJ, joueur, propriétaire), erreurs HTTP propres (400, 401, 403, 404, 500), endpoints ne permettant pas d'accéder aux données d'une autre campagne.

### 6.2 Règles frontend

Chaque évolution frontend doit avoir :

- TypeScript OK (`tsc --noEmit`) ;
- build Vite OK (`npm run build`) ;
- appels API centralisés autant que possible ;
- fallback local uniquement temporaire ;
- états d'erreur visibles ;
- comportement responsive vérifié ;
- documentation si l'usage change.

Respecter : React + TypeScript, pas de build Vite cassé, pas d'import inutilisé, pas de composant orphelin, séparation claire logique métier/composants UI/appels API/état local.

### 6.3 Règles spécifiques interface MJ

- Éviter les doubles headers de panneaux
- Garder les panneaux déplaçables lisibles
- Préserver fermer/réduire/dock/rouvrir
- Ne pas bloquer la carte
- Garder une interface utile en session réelle
- Ne pas empiler des fonctionnalités dans le mode Partie — tout outil lourd va dans Préparation ou Avancé

### 6.4 Validation minimale avant merge

```bash
uv run python -m compileall backend/app
cd frontend && npx tsc --noEmit
docker compose up -d --build
sh scripts/wait-api.sh
curl -fsS http://127.0.0.1:8091/api/health
sh scripts/smoke-backend.sh
```

### 6.5 Définition de fini pour chaque sprint panneau

Chaque sprint panneau doit valider :

- panneau déclaré dans `vttPanels.ts` ;
- panneau rendu dans `VttBoard.tsx` ;
- `data-vtt-panel`, `data-floating-widget`, `data-floating-title` corrects ;
- CSS commun utilisé ;
- bouton Actions rapides si pertinent ;
- script de vérification ;
- TypeScript OK, Docker build OK ;
- test navigateur : dock/réduire/fermer/rouvrir/épingler/verrouiller.

### 6.6 Commandes de validation standard

```bash
sh scripts/check-gm-panel-css.sh
sh scripts/check-vtt-panels.sh
sh scripts/check-panel-system.sh
sh scripts/check-frontend-types.sh

docker compose up -d --build
sh scripts/wait-api.sh
curl -fsS http://127.0.0.1:8091/api/health
curl -I http://127.0.0.1:8090
```

### 6.7 Checklist globale de qualité avant merge

- `git status` clean
- build Docker OK
- health backend OK
- smoke tests OK
- frontend accessible
- test navigateur rapide
- documentation mise à jour
- commit clair
- push branche
- merge main
- tag si release

### 6.8 Toolchain obligatoire

- Backend : `uv` (pas `pip`, pas `venv` manuel)
- Frontend : `npm ci` (pas `npm install`), `.node-version` fait foi, `tsc --noEmit`
- CI : cohérent avec les commandes locales

### 6.9 Ordre de priorité des branches

sécurité des frontières joueur/MJ → permissions WebSocket → stabilité fog/API/paramètres → tests d'autorisation et E2E → build reproductible → navigation → design tokens → dette CSS → UX carte.

Le découpage détaillé des correctifs issus de l'audit de `main` du
2026-06-10 est suivi dans
`docs/work-in-progress/2026-06-10-main-audit-remediation.md`.

---

*Document fusionné à partir de `roadmap.md`, `project-roadmap.md`, `product-development.md` et `gm-roadmap.md` — 2026-06-03.*
