# Plan : Distinction des Interfaces MJ et Joueur

> **Pour Hermes :** Ce plan documente l'état actuel et les spécifications cibles des deux interfaces. Les phases d'implémentation suivront après validation.

**Date :** 2026-06-01
**Auteur :** Hermes Agent (revue du code + roadmap)
**Références :** `README.md`, `CHANGELOG.md`, `docs/roadmap.md`, `.hermes/developer-rules.md`

---

## 1. Vision d'ensemble

Le produit DnD Interface est **GM-first** (roadmap, Principe 1). Chaque phase doit d'abord aider le MJ, puis enrichir l'expérience joueur. Les deux interfaces doivent être **nettement séparées**, avec des périmètres de permissions clairs.

| Propriété | Interface MJ | Interface Joueur |
|-----------|-------------|-----------------|
| **Nombre d'endpoints accessibles** | ~83 (tous) | ~12 (player router + endpoints partagés) |
| **Composants React** | 26 dédiés GM | 1 (PlayerView) + 1 partagé (EditCharacterSheet) |
| **Compte requis** | `account_type = gm` | `account_type = player` |
| **Accès** | Créer/Modifier/Supprimer tout | Lecture seule + actions joueur (jets, persos) |
| **WebSocket** | Reçoit tous les événements | Reçoit événements filtrés (scène, combat, handouts) |

---

## 2. Interface MJ — État actuel et cible

### 2.1 Ce qui existe déjà ✅

L'interface GM est déjà riche et couvre l'essentiel du workflow MJ :

| Zone | Composants | Fonctionnalités |
|------|-----------|----------------|
| **Sidebar gauche** | `App.tsx` | Navigation : campagnes, actualiser, déconnexion |
| **Création campagne** | formulaire inline dans `App.tsx` | Nom, description |
| **Liste campagnes** | `CampaignList.tsx`, `CampaignSidebar.tsx` | Sélection, aperçu membres |
| **Gestion membres** | `App.tsx` (invite section) | Créer invitation, voir membres, rôles |
| **Personnages** | `CharacterPanel.tsx`, `EditCharacterSheet.tsx` | Créer, lister, éditer toutes les fiches |
| **Carte VTT** | `VttBoard.tsx`, `FogLayer.tsx` | Scènes, tokens, assets, fog of war, zoom/pan |
| **Combat** | `CombatPanel.tsx`, `InitiativePanel.tsx` | Initiative, HP, KO, tours, conditions |
| **Dés + Journal** | `SessionLogPanel.tsx`, `SessionWorkspace.tsx` | Jets, notes, catégories, épingles, export |
| **Handouts** | `HandoutPanel.tsx` | Créer, révéler, supprimer documents |
| **Homebrew** | `HomebrewPanel.tsx` | Créatures, objets, import/export |
| **Notes MJ** | `GmNotesPanel.tsx` | Notes privées, visibilité gm_team/author_only |
| **Visibilité** | `VisibilityInspectorPanel.tsx` | Toggle visible/caché par token, bulk |
| **Onglets** | `CampaignViewTabs.tsx` | Vue campagne, live, préparation |
| **Topbar** | `AppTopbar.tsx` | Statut temps réel, présence, nom utilisateur |
| **Widgets flottants** | `VttPanelsMenu.tsx`, `QuickActionsPanel.tsx`, etc. | Panneaux détachables, presets |

### 2.2 Ce qui manque ❌

| Fonctionnalité | Priorité | Note |
|---------------|----------|------|
| Mesures et gabarits (distance, cercle, cône) | 🔜 Phase 18 | Roadmap |
| Bibliothèque SRD (sorts, monstres officiels) | ⏳ Phase 19 | Roadmap |
| Sauvegardes/restore automatiques | ⏳ Phase 20 | Roadmap |
| Dashboard statistiques campagne | 💡 Suggestion | Sessions jouées, jets, combats |
| Mode préparation hors-ligne | 💡 Suggestion | Éditer sans WebSocket |

### 2.3 Architecture de l'interface GM

```
┌──────────────────────────────────────────────────────────────┐
│  Topbar : [status websocket] [présence] [nom MJ] [déco]     │
├────────┬─────────────────────────────────────────────────────┤
│Sidebar │  [Onglets: Campagne | Live | Préparation]          │
│        │                                                     │
│Campagnes│  ┌─────────────────────────────────────────────┐   │
│  + Créer│  │  Panneau campagne : membres, invitations     │   │
│  Liste  │  │  Personnages : créer, lister, éditer        │   │
│         │  │  Barre mode session live                    │   │
│Actualiser│  └─────────────────────────────────────────────┘   │
│Déco     │                                                     │
│         │  ┌──────────────────┬──────────────────────────┐   │
│         │  │  Carte VTT        │  Panneaux contrôle       │   │
│         │  │  - Scènes         │  - Initiative            │   │
│         │  │  - Tokens         │  - Combat                │   │
│         │  │  - Fog of War     │  - Handouts              │   │
│         │  │  - Assets         │  - Homebrew              │   │
│         │  │  - Zoom/Pan       │  - Notes MJ              │   │
│         │  │                   │  - Visibilité            │   │
│         │  └──────────────────┴──────────────────────────┘   │
│         │                                                     │
│         │  Journal de session : dés, notes, catégories       │
└────────┴─────────────────────────────────────────────────────┘
```

---

## 3. Interface Joueur — État actuel et cible

### 3.1 Ce qui existe déjà ✅

| Onglet | Fonctionnalités |
|--------|----------------|
| **Personnages** | Créer son perso (formulaire simplifié), lister ses persos, fiche éditable, jets rapides d20 |
| **Dés** | Lancer formule libre, label, résultat, historique des jets |
| **Documents** | Voir les handouts partagés (public + players révélés) |
| **Combat** | Voir l'état du combat (liste combattants visibles, initiative, round, KO) |

### 3.2 Ce qui manque ❌ (par priorité)

| # | Fonctionnalité | Impact | Backend prêt ? |
|---|---------------|--------|---------------|
| 1 | **Carte de la scène active (read-only)** — le joueur doit voir la carte, les tokens non-cachés, et le fog of war | 🔴 Critique — le joueur ne voit pas la carte du tout | ✅ `player_scenes`, `player_scene_tokens` |
| 2 | **Mise à jour temps réel de la carte** — WebSocket pour les tokens, scènes | 🔴 Critique — sans ça, le joueur doit rafraîchir manuellement | ⚠️ Partiel (WebSocket existe mais n'est pas branché côté PlayerView) |
| 3 | **Fog of War côté joueur** — le joueur voit uniquement les zones révélées | 🟡 Important | ✅ `fog_zones` dans l'API scène |
| 4 | **Jet de dé avec avantage/désavantage** — le joueur ne peut faire que des jets normaux | 🟡 Important | ✅ Backend supporte déjà `mode` |
| 5 | **Historique de session (journal joueur)** — le joueur doit voir les événements publics | 🟡 Important | ✅ Backend `GET /log` filtre déjà par visibilité |
| 6 | **Fiche personnage : boutons contextuels par compétence** — jets liés aux skills du perso (athlétisme, discrétion, etc.) | 🟢 Nice-to-have | ✅ Skills sont stockés dans `characters.skills` |
| 7 | **Chat/notes de session** — le joueur peut écrire des notes visibles par le MJ | 🟢 Nice-to-have | ✅ `POST /log` avec visibilité |
| 8 | **Upload avatar personnage** — image pour le token | 🟢 Nice-to-have | ⚠️ Partiel (assets existent mais pas liés aux persos) |
| 9 | **Son/notification** — notification quand c'est son tour en combat | 🟢 Nice-to-have | ❌ Pas implémenté |
| 10 | **Page onboarding après première connexion** — guide le joueur étape par étape | 🟢 Nice-to-have | ❌ Pas implémenté |

### 3.3 Architecture cible de l'interface Joueur

```
┌──────────────────────────────────────────────────────────────┐
│  Header : [nom campagne] [MJ: X] [connectés: N] [moi: Y]   │
├──────────────────────────────────────────────────────────────┤
│  [Persos] [Carte] [Dés] [Documents] [Combat] [Journal]      │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌─ Onglet Carte ──────────────────────────────────────────┐ │
│  │  ┌──────────────────────┬──────────────────────────────┐ │ │
│  │  │  Carte (read-only)    │  Infos scène                │ │ │
│  │  │  - Image de fond      │  - Nom scène                │ │ │
│  │  │  - Tokens visibles    │  - Grille                   │ │ │
│  │  │  - Fog of War (noir)  │  - Zoom/Pan                 │ │ │
│  │  │  - Pas de contrôles   │  - Joueurs connectés        │ │ │
│  │  └──────────────────────┴──────────────────────────────┘ │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                               │
│  ┌─ Onglet Personnages ────────────────────────────────────┐ │
│  │  Liste persos | Fiche éditable | Création simplifiée    │ │
│  │  Jets rapides par caractéristique/compétence            │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                               │
│  ┌─ Onglet Dés ────────────────────────────────────────────┐ │
│  │  Formule libre | Avantage/Désavantage | Historique      │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                               │
│  ┌─ Onglet Documents ──────────────────────────────────────┐ │
│  │  Handouts visibles (public + révélés)                   │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                               │
│  ┌─ Onglet Combat ─────────────────────────────────────────┐ │
│  │  État read-only : combattants visibles, initiative, HP  │ │
│  │  Indicateur "ton tour" si player_controlled             │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                               │
│  ┌─ Onglet Journal ────────────────────────────────────────┐ │
│  │  Événements publics : jets, notes, événements           │ │
│  │  Ajouter une note personnelle                           │ │
│  └──────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
```

---

## 4. Flux d'onboarding Joueur

L'expérience joueur commence par une invitation. Le flux complet doit être :

```
1. Le joueur reçoit un lien d'invitation (/invite/{token})
                    ↓
2. Page InvitePage affiche :
   - Nom de la campagne
   - Rôle proposé (joueur)
   - Places restantes
   - Bouton "Créer un compte" ou "Se connecter"
                    ↓
3. Inscription/Connexion (account_type=player forcé)
   - Si nouveau : formulaire inscription + token auto-rempli
   - Si existant : login normal
                    ↓
4. Auto-join de la campagne
                    ↓
5. Redirection vers PlayerView
   - Premier arrivé : onboarding "Crée ton personnage"
   - Personnage créé → dashboard complet
```

### 4.1 Problèmes actuels du flux

| Étape | Problème | Impact |
|-------|---------|--------|
| Après join | Le joueur voit PlayerView mais **aucune indication** de ce qu'il doit faire | Le joueur est perdu |
| Création perso | Formulaire simplifié mais pas de suggestion de valeurs par défaut | Intimidant pour un nouveau joueur |
| Invite expirée | Message d'erreur peu clair | Frustration |
| WebSocket | Pas connecté côté PlayerView → pas de temps réel | Le joueur ne voit pas les mises à jour de la carte |

---

## 5. Permissions et sécurité

### 5.1 Matrice des permissions par rôle

| Ressource | GM | Co-GM | Joueur |
|-----------|-----|-------|--------|
| Créer/modifier/supprimer campagne | ✅ | ❌ | ❌ |
| Créer invitation | ✅ | ✅ | ❌ |
| Créer/modifier scènes | ✅ | ✅ | ❌ |
| Voir scènes | ✅ | ✅ | ✅ (read-only) |
| Créer/modifier tokens | ✅ | ✅ | ❌ |
| Voir tokens (non cachés) | ✅ | ✅ | ✅ |
| Déplacer ses tokens | ✅ | ✅ | ❌ (futur) |
| Créer/modifier combat | ✅ | ✅ | ❌ |
| Voir combat | ✅ | ✅ | ✅ (read-only) |
| Créer/modifier handouts | ✅ | ✅ | ❌ |
| Voir handouts révélés | ✅ | ✅ | ✅ |
| Créer perso (le sien) | ✅ | ✅ | ✅ |
| Éditer perso (le sien) | ✅ | ✅ | ✅ |
| Éditer perso (autres) | ✅ | ✅ | ❌ |
| Lancer dés | ✅ | ✅ | ✅ (public only) |
| Voir journal complet | ✅ | ✅ | ❌ (public only) |
| Accéder aux notes MJ | ✅ | ✅ (si gm_team) | ❌ |
| Accéder au homebrew | ✅ | ✅ | ❌ |
| Gérer les assets | ✅ | ✅ | ❌ |
| Voir fog of war complet | ✅ | ✅ | ❌ |
| Voir fog of war (zones révélées) | ✅ | ✅ | ✅ |

### 5.2 Vérifications backend déjà en place

- `require_campaign_role(campaign_id, user_id, {"gm", "co_gm"})` — protège les endpoints GM
- `require_campaign_role(campaign_id, user_id, {"player"})` — protège les endpoints joueur
- `require_gm_account` — bloque les comptes `account_type=player` de créer des campagnes
- `player.py` router — endpoints dédiés joueur avec filtrage (`is_hidden=false`, `visibility=public/players`)
- `PlayerEncounterPublic` — schéma réduit sans données sensibles (HP exacts cachés, pas de notes GM)
- Audit `permission_audit` — trace toutes les actions joueur

---

## 6. Priorités d'implémentation

Basé sur l'analyse ci-dessus, voici l'ordre recommandé :

### 🔴 Priorité Critique (utilisable sans ces features)

| Ordre | Tâche | Effort | Backend requis |
|-------|-------|--------|---------------|
| 1 | **WebSocket temps réel dans PlayerView** — recevoir les événements scène/token/handout | 2h | ❌ (existe déjà) |
| 2 | **Onglet Carte dans PlayerView** — afficher la scène active, tokens visibles, fog of war | 4h | ❌ (`player_scenes`, `player_scene_tokens` existent) |
| 3 | **Fog of War joueur** — canvas overlay avec `isGM=false`, voit uniquement zones révélées | 1h | ❌ (FogLayer gère déjà `isGM`) |
| 4 | **Propagation zoom/pan joueur** — le joueur peut zoomer/déplacer sa vue indépendamment | 1h | ❌ (état local uniquement) |

### 🟡 Priorité Haute (améliore significativement l'expérience)

| Ordre | Tâche | Effort | Backend requis |
|-------|-------|--------|---------------|
| 5 | **Onglet Journal** — historique des jets publics et événements de session | 2h | ❌ (`GET /log` avec filtrage) |
| 6 | **Jets avec avantage/désavantage** — toggle dans le lanceur de dés joueur | 0.5h | ❌ (`mode` déjà supporté) |
| 7 | **Jets rapides par compétence** — boutons contextuels basés sur les skills du perso | 1h | ❌ (skills stockés) |

### 🟢 Nice-to-have (peaufine l'expérience)

| Ordre | Tâche | Effort | Note |
|-------|-------|--------|------|
| 8 | **Indicateur "ton tour" en combat** — surbrillance quand c'est le tour d'un combattant player_controlled | 1h | |
| 9 | **Onboarding première connexion** — wizard "Crée ton personnage" → dashboard | 2h | |
| 10 | **Notes personnelles** — le joueur peut écrire des notes visibles par le MJ | 1.5h | `POST /log` avec visibility=gm |
| 11 | **Notification sonore** — ding quand c'est son tour | 0.5h | |

---

## 7. Plan d'exécution par phases

### Phase 18-A — Carte Joueur (Critique)

**Objectif :** Le joueur voit la carte, les tokens, et le fog of war.

```
Backend : aucun (endpoints player_scenes, player_scene_tokens déjà prêts)

Frontend :
  1. Composant PlayerMap.tsx — carte read-only avec :
     - Image de fond de la scène active
     - Tokens visibles (positionnés, colorés, nommés)
     - Fog of War overlay (isGM=false)
     - Zoom/Pan local (indépendant du MJ)
  2. WebSocket PlayerView — recevoir événements scène/token
  3. Intégration dans PlayerView — nouvel onglet "Carte"
  4. CSS dédié
```

### Phase 18-B — Journal Joueur (Haute)

**Objectif :** Le joueur voit l'historique public de la session.

```
Frontend :
  1. Récupérer GET /api/campaigns/{id}/log (filtré public)
  2. Afficher timeline simple dans PlayerView
  3. Onglet "Journal"
```

### Phase 18-C — Améliorations dés (Haute)

**Objectif :** Jets avec avantage/désavantage, boutons par compétence.

```
Frontend :
  1. Toggle avantage/normal/désavantage dans le lanceur de dés
  2. Boutons de compétences contextuels (athlétisme, perception, etc.)
```

---

## 8. Métriques de succès

Après implémentation des phases critiques (18-A, 18-B, 18-C) :

| Métrique | Actuel | Cible |
|----------|--------|-------|
| Onglets PlayerView | 4 | 6 (ajout Carte + Journal) |
| Le joueur voit la carte | ❌ | ✅ |
| Temps réel dans PlayerView | ❌ | ✅ (WebSocket) |
| Jets avantage/désavantage | ❌ | ✅ |
| Jets par compétence | ❌ | ✅ |
| Composants joueur | 1 (PlayerView) | 2 (PlayerView + PlayerMap) |
| CSS lignes joueur | ~500 | ~800 |

---

## 9. Fichiers impactés

| Fichier | Action | Phase |
|---------|--------|-------|
| `frontend/src/components/PlayerView.tsx` | MODIFY : ajouter onglets Carte + Journal, WebSocket, avantage/désavantage | 18-A, 18-B, 18-C |
| `frontend/src/components/PlayerMap.tsx` | CREATE : carte read-only joueur avec tokens + fog | 18-A |
| `frontend/src/components/FogLayer.tsx` | MODIFY : s'assurer que isGM=false fonctionne côté joueur | 18-A |
| `frontend/src/App.tsx` | MODIFY : passer WebSocket ou données temps réel à PlayerView | 18-A |
| `frontend/src/styles.css` | MODIFY : styles carte joueur, journal, onglet supplémentaire | 18-A, 18-B |
| `frontend/src/api/types.ts` | MODIFY : types si nécessaire | 18-A |

---

## 10. Convention de branches

```
feat/player-map        → Phase 18-A (carte joueur)
feat/player-journal    → Phase 18-B (journal joueur)
feat/player-dice-adv   → Phase 18-C (dés améliorés)
```

Chaque branche → merge sur `main` après : tests OK + build OK + smoke + doc.

---

**Plan prêt pour validation. Procéder à l'implémentation ?**
