# Interface Utilisateur Frontend — DnD Virtual Tabletop

> **Document de référence** — Fusion de `frontend-panels.md`, `frontend-improvement-plan.md`, `gm-interface-action-plan.md`, `gm-panel-stabilization.md` et `gm-panel-test-matrix.md`.
> **Date :** 3 juin 2026
> **Version :** 1.0

---

## Table des matières

1. [Registre des panneaux](#1-registre-des-panneaux)
2. [Fondations CSS](#2-fondations-css)
3. [Standards des panneaux](#3-standards-des-panneaux)
4. [Panneaux flottants](#4-panneaux-flottants)
5. [Règles d'implémentation](#5-règles-dimplémentation)
6. [Checklist de test](#6-checklist-de-test)

---

## 1. Registre des panneaux

### 1.1 Source de vérité

Le fichier `frontend/src/config/gmPanels.ts` est la **source de vérité unique** pour tous les panneaux de l'interface Maître du Jeu (MJ). Tout panneau doit y être déclaré.

Chaque entrée du registre contient :

| Champ        | Description                                     |
|-------------|--------------------------------------------------|
| `id`        | Identifiant unique (kebab-case)                  |
| `label`     | Nom affiché en français                          |
| `emoji`     | Icône associée                                   |
| `category`  | Onglet de rattachement                           |
| `status`    | `active` (implémenté) ou `planned` (à faire)     |
| `detachable`| Peut être ouvert en fenêtre flottante            |

### 1.2 Inventaire par onglet

#### Session Live (`live`)

| ID                    | Label                    | Statut   |
|-----------------------|--------------------------|----------|
| `combat`              | ⚔️ Combat                | active   |
| `encounter-builder`   | 🧩 Générateur de rencontres | active |
| `dice-roller`         | 🎲 Lancer de dés          | active   |
| `quick-actions`       | ⚡ Actions rapides         | active   |
| `gm-messages`         | 💬 Communication          | active   |
| `gm-notes`            | 📝 Notes MJ               | active   |
| `initiative`          | ⏱️ Initiative             | active   |
| `token-detail`        | 🔍 Détail token           | active   |
| `visibility-inspector`| 👁️ Visibilité             | active   |
| `active-encounter`    | ⚔️ Rencontre active       | active   |
| `conditions`          | 🏷️ États / conditions     | active   |
| `ambiance`            | 🎵 Ambiance               | active   |
| `chat`                | 💭 Chat en direct         | active   |

#### Préparation (`preparation`)

| ID                    | Label                    | Statut   |
|-----------------------|--------------------------|----------|
| `dungeon-generator`   | 🗺️ Générateur de donjons  | active   |
| `handouts`            | 📄 Documents              | active   |
| `scene`               | 🎬 Scènes                 | active   |
| `tokens`              | 🎭 Tokens                 | active   |
| `token-library`       | 🗂️ Bibliothèque tokens    | active   |

#### Journal (`journal`)

| ID                    | Label                    | Statut   |
|-----------------------|--------------------------|----------|
| `session-log`         | 📋 Journal                | active   |
| `session-stats`       | 📊 Statistiques           | active   |

#### Bibliothèque (`library`)

| ID                    | Label                    | Statut   |
|-----------------------|--------------------------|----------|
| `bestiary`            | 💀 Bestiaire              | active   |
| `spellbook`           | ✨ Grimoire               | active   |
| `items`               | 🎒 Équipement             | active   |
| `homebrew`            | 📚 Bibliothèque           | active   |
| `rules`               | 📖 Règles (SRD)           | active   |
| `npc-generator`       | 🧑 Générateur PNJ         | active   |

#### Personnages (`characters`)

| ID                    | Label                    | Statut   |
|-----------------------|--------------------------|----------|
| `characters`          | 👤 Personnages            | active   |
| `party-summary`       | 📊 Résumé du groupe       | active   |

#### Campagne (`campaign`)

| ID                    | Label                    | Statut   |
|-----------------------|--------------------------|----------|
| `campaign-info`       | 📋 Infos campagne         | active   |

### 1.3 Mapping IDs legacy → standard

Les IDs historiques (utilisés dans `App.tsx`) ont été normalisés vers le standard kebab-case du registre :

| Ancien (App.tsx)   | Nouveau (gmPanels.ts)   | Migré ? |
|--------------------|--------------------------|---------|
| `quickactions`     | `quick-actions`          | ✅      |
| `sessionlog`       | `session-log`            | ✅      |
| `dice`             | `dice-roller`            | ✅      |
| `encounter`        | `encounter-builder`      | ✅      |
| `messages`         | `gm-messages`            | ✅      |
| `dungeon`          | `dungeon-generator`      | ✅      |
| `stats`            | `session-stats`          | ✅      |

### 1.4 Modes de Session Live

Définis dans `frontend/src/config/sessionLiveModes.ts` (source unique). Chaque mode filtre les panneaux visibles via `SESSION_LIVE_PANEL_SETS` :

| Mode            | Panneaux visibles | Usage                                    |
|-----------------|-------------------|------------------------------------------|
| `exploration`   | 21                | Tous les panneaux actifs                 |
| `combat`        | 13                | Combat, initiative, dés, actions, visibilité |
| `roleplay`      | 13                | Notes, messages, handouts, personnages   |
| `quick-prep`    | 14                | Donjons, bestiaire, sorts, équipement    |
| `minimal`       | 6                 | Combat, dés, token, journal, messages    |

Les modes ne sont pas des onglets : ce sont des **layouts de panneaux** adaptés au contexte de la session.

### 1.5 Onglets GM globaux

Au-dessus des panneaux, l'interface GM s'organise en **onglets** qui sont les grands espaces de travail :

| Onglet          | Rôle                                                    |
|-----------------|---------------------------------------------------------|
| **Campagne**    | Admin, invitations, membres, résumé, statut             |
| **Préparation** | Scènes, cartes, tokens, PNJ, rencontres, notes secrètes |
| **Session Live**| Carte/VTT, panneaux contextuels, journal live           |
| **Personnages** | Fiches, résumé du groupe, PV, CA, états, inventaire     |
| **Journal**     | Archive complète : jets, messages, événements, recherche |
| **Bibliothèque**| Monstres, PNJ, objets, sorts, règles, tokens, musiques  |
| **Paramètres**  | Permissions, système, brouillard de guerre, thème, audio |

### 1.6 Script de vérification du registre

```bash
bash scripts/check-gm-panels-current.sh
```

Vérifie :
1. Tous les panneaux `active` sont présents dans `App.tsx`
2. Aucun ID dupliqué dans le registre
3. Cohérence `fp.open()` ↔ `panel.id` (floating panels)
4. Aucun script legacy ne référence `VttBoard.tsx`
5. `gmPanels.ts` est l'unique registre

### 1.7 Roadmap des sprints terminés

| Sprint     | Objectif                                                    | Statut |
|------------|-------------------------------------------------------------|--------|
| PANEL-1    | Registre unique + script de vérification + documentation    | ✅     |
| PANEL-2    | Normalisation des IDs dans App.tsx (7 mappings)             | ✅     |
| PANEL-3    | Réintégration de 5 panneaux planned → active                | ✅     |
| PANEL-4    | Branchement des modes Session Live (21 filtres)             | ✅     |
| PANEL-5    | Nettoyage legacy (useFloatingWidgets, VttBoard, 12 scripts) | ✅     |

**Détail PANEL-5 —** Suppressions : `QuickActionsPanel.tsx` (orphelin), `useFloatingWidgets.ts` (remplacé par `useFloatingPanels`), `vttPanels.ts` (wrapper legacy), 12 scripts `check-*.sh` (référençaient `VttBoard.tsx` inexistant). Scripts conservés : `check-gm-panels-current.sh` et `check-gm-panel-css.sh`.

---

## 2. Fondations CSS

### 2.1 Problème : fichier CSS monolithique

Le fichier `frontend/src/index.css` contient **11 855 lignes** sans aucune segmentation. Ce fichier unique regroupe les styles de la carte, des panneaux, de l'authentification, du lobby, des tokens, etc.

**Cible :** découper en modules thématiques :

- `styles/map.css` — carte, grille, tokens, brouillard de guerre
- `styles/panels.css` — panneaux GM, sidebar, dock
- `styles/auth.css` — login, inscription
- `styles/lobby.css` — lobby joueur et MJ
- `styles/combat.css` — tracker de combat, initiative
- `styles/tokens.css` — tokens, nameplates, états

### 2.2 Socle CSS commun des panneaux (GM-2D-CSS)

Tous les panneaux GM partagent un socle de classes CSS standardisées. Un nouveau panneau doit utiliser ces classes avant d'écrire du CSS spécifique.

| Classe                | Usage                                      |
|-----------------------|--------------------------------------------|
| `gm-panel-content`    | Conteneur principal du contenu             |
| `gm-panel-section`    | Section interne d'un panneau               |
| `gm-panel-context`    | Texte contextuel / description             |
| `gm-panel-stat`       | Affichage de statistique (valeur + label)  |
| `gm-panel-card`       | Carte d'information (entité, item, etc.)   |
| `gm-panel-row`        | Ligne horizontale flexible                 |
| `gm-panel-list`       | Liste d'éléments                           |
| `gm-panel-actions`    | Barre d'actions (boutons)                  |
| `gm-panel-button`     | Bouton standard de panneau                 |
| `gm-panel-muted`      | Texte secondaire / désactivé               |
| `gm-panel-badge`      | Badge / compteur                           |
| `gm-panel-progress`   | Barre de progression (PV, etc.)            |

**Règle :** le CSS spécifique à un panneau est autorisé uniquement pour du contenu métier réellement particulier.

**Panneaux déjà refactorisés avec le socle commun :** Notes MJ, Résumé du groupe, Initiative, Actions rapides, Visibilité, Bibliothèque tokens, Documents, États/Conditions, Rencontre active.

**Validation CSS :**
```bash
bash scripts/check-gm-panel-css.sh
```

### 2.3 Thème clair/sombre

À terme, le thème doit être piloté par des variables CSS et un toggle utilisateur avec persistance en `localStorage`. Actuellement, le thème sombre (`#0f1923` / `#e0dcc8`) est codé en dur. Les joueurs qui souhaitent imprimer des handouts en souffrent.

---

## 3. Standards des panneaux

### 3.1 Règle fondamentale

Tous les panneaux GM doivent respecter le même contrat. Il n'y a pas d'exception.

Chaque panneau doit posséder :

- **Un seul header** (pas de double header)
- Les mêmes boutons d'action
- Les mêmes états
- La même logique de dock
- La même logique de réouverture
- La même logique de sauvegarde

### 3.2 Attributs HTML obligatoires

Chaque panneau doit exposer ces attributs `data-*` :

| Attribut                | Rôle                                      |
|-------------------------|-------------------------------------------|
| `data-vtt-panel`        | Identifie le conteneur comme panneau VTT  |
| `data-floating-widget`  | Permet la détection par le hook flottant  |
| `data-floating-title`   | Titre utilisé dans la barre de titre      |

### 3.3 États standards

Un panneau peut être dans un ou plusieurs de ces états simultanément :

| État               | Description                                      |
|--------------------|--------------------------------------------------|
| **Ouvert**         | Visible et interactif                            |
| **Fermé**          | Masqué, accessible via le dock ou le menu        |
| **Réduit**         | Minimisé dans le dock                            |
| **Docké**          | Ancrée dans la sidebar ou le dock                |
| **Flottant**       | Détaché, draggable au-dessus de la carte         |
| **Épinglé**        | Reste visible même après fermeture d'autres      |
| **Verrouillé**     | Position fixe, non déplaçable                    |
| **Redimensionnable** | Peut être agrandi/réduit par le coin          |
| **Repositionnable**  | Peut être déplacé par drag du titre            |

### 3.4 Boutons standards

Chaque panneau expose ces actions dans son header :

| Bouton   | Action                     |
|----------|----------------------------|
| ↑        | Mettre au premier plan     |
| 📌       | Épingler / désépingler     |
| 🔒       | Verrouiller / déverrouiller|
| −        | Réduire dans le dock       |
| ×        | Fermer                     |

### 3.5 Organisation de l'interface

**Règle UX :** la toolbar VTT ne contient que les actions de carte. La gestion des panneaux est centralisée dans :

- Le menu **Panneaux** (affichage, reset)
- Le **dock** des panneaux masqués (réouverture rapide)
- La **toolbar runtime** de chaque panneau (header standard)

**À éviter :**
- Boutons de reset de panneaux dans la toolbar carte
- Double header sur un même panneau
- Contrôles redondants entre la toolbar et le menu Panneaux

---

## 4. Panneaux flottants

### 4.1 Principes

Les panneaux flottants permettent au MJ de détacher un outil de la sidebar et de le positionner librement au-dessus de la carte. C'est essentiel pour les outils de session live (Combat Tracker, Dice Roller, Initiative).

**Objectifs :**
- Libérer l'espace carte en supprimant les colonnes fixes
- Permettre au MJ de superposer les outils dont il a besoin
- Persister les positions entre les sessions

### 4.2 Architecture

```
FloatingPanelSystem
├── useFloatingPanels()          // Hook : positions, visibilité, pile z-index
│   ├── panels: Map<id, PanelState>
│   ├── open(component, config)
│   ├── close(id)
│   ├── minimize(id)
│   └── persist() → localStorage
│
├── FloatingPanel                // Composant wrapper
│   ├── DragHandle (barre de titre)
│   ├── ResizeHandle (coin SE)
│   ├── Boutons Minimize / Close
│   ├── Snap-to-edges
│   └── Double-clic titre → maximise
│
└── PanelOverlay                 // Conteneur z-index au-dessus de la carte
    └── {panels.map(p => <FloatingPanel key={p.id} {...p} />)}
```

### 4.3 Hook `useFloatingPanels`

Remplace l'ancien `useFloatingWidgets` (supprimé en PANEL-5). Utilise `fp.open()` comme API canonique pour ouvrir un panneau flottant.

### 4.4 Mode focus map

Un bouton dans la topbar masque sidebar et panneaux pour passer la carte en plein écran (`position: fixed; inset: 0`). La topbar devient flottante avec les contrôles essentiels. Le layout passe de 3 colonnes fixes (210px + carte + 320px) à une carte plein écran avec minimap.

### 4.5 Interface joueur

**Problème actuel :** la sidebar joueur (`PlayerView.tsx`) est un scroll monolithique de 5 sections (personnages, dés, documents, combat, journal).

**Cible :** remplacer par un système d'onglets (👤 🎲 📄 ⚔️ 📝) qui affiche un seul panneau à la fois. Sur mobile, le layout s'empile naturellement.

### 4.6 Améliorations connexes de la carte

Resize handles, centrage automatique, minimap (canvas 160×120), snap visuel au drag, raccourcis clavier (`Space`=pan, `G`=grid, `F`=fullscreen, `Ctrl+Z`=undo), indicateurs d'état sur tokens (glow rouge bloodied, overlay gris incapacité, étoile concentration), transition entre scènes (fondu 300ms).

---

## 5. Règles d'implémentation

### 5.1 Règles générales

1. **Tout panneau nouveau ou modifié doit être déclaré dans `gmPanels.ts`.**
2. **Utiliser le socle CSS commun (`gm-panel-*`) avant tout CSS spécifique.**
3. **Respecter les attributs `data-vtt-panel`, `data-floating-widget`, `data-floating-title`.**
4. **Un seul header par panneau.** Pas de duplication.
5. **Ne jamais dupliquer un bouton destructif de layout** (reset panneaux) dans la toolbar carte.
6. **Le menu Panneaux est le centre de contrôle unique** (affichage, reset, layout).
7. **La toolbar VTT ne contient que les actions de carte** (outils, zoom, scènes).
8. **Pas de import inutilisé, pas de composant orphelin.**

### 5.2 Règles par fichier sensible

| Fichier                  | Précaution                                        |
|--------------------------|---------------------------------------------------|
| `App.tsx`                | Ne pas casser le rendu, référencer via le registre|
| `frontend/src/index.css` | Ne pas ajouter sans réfléchir au découpage futur  |
| `gmPanels.ts`            | Toujours garder la cohérence avec App.tsx         |
| `sessionLiveModes.ts`    | Pas de code mort (ex-FloatingWidgetPreset)        |

### 5.3 Validation obligatoire avant merge

Chaque modification des panneaux doit passer :

```bash
# TypeScript
cd frontend && npx tsc --noEmit

# Build Vite
cd frontend && npm run build

# Vérifications spécifiques panneaux
bash scripts/check-gm-panels-current.sh
bash scripts/check-gm-panel-css.sh

# Backend (si impact)
cd backend && uv run pytest --tb=short -q
```

### 5.4 Plan d'amélioration priorisé

#### Phase 1 — Correctifs critiques (~2h)

| #  | Tâche                                              | Impact    |
|----|----------------------------------------------------|-----------|
| 1  | Fix fond de carte joueur : hook `useSceneBackground`| 🔴 Bloquant |
| 2  | Centrage automatique de la carte au chargement      | 🔴 UX     |
| 3  | Mode focus map : bouton fullscreen carte            | 🔴 UX     |
| 4  | Resize handles entre colonnes                       | 🟠 UX     |

#### Phase 2 — Panneaux flottants (~4h)

| #  | Tâche                                              | Impact    |
|----|----------------------------------------------------|-----------|
| 1  | Système `FloatingPanelSystem` complet               | 🟠 Core   |
| 2  | Combat Tracker en panneau flottant                  | 🟠 UX     |
| 3  | Dice Roller en panneau flottant                     | 🟠 UX     |
| 4  | Bouton « Cacher tous les panneaux »                 | 🟠 UX     |

#### Phase 3 — Interface joueur (~3h)

| #  | Tâche                                              | Impact    |
|----|----------------------------------------------------|-----------|
| 1  | Système d'onglets dans la sidebar joueur            | 🟠 UX     |
| 2  | Dice roller joueur amélioré (boutons d20 rapides)   | 🟡 UX     |
| 3  | Outils MapTools accessibles aux joueurs (ping+règle)| 🟠 UX     |

#### Phase 4 — Carte immersive (~3h)

| #  | Tâche                                              | Impact    |
|----|----------------------------------------------------|-----------|
| 1  | Minimap                                             | 🟡 UX     |
| 2  | Raccourcis clavier complets                         | 🟡 UX     |
| 3  | Snap visuel pendant le drag                         | 🟡 Polish |
| 4  | Indicateurs d'état sur les tokens                   | 🟡 Immersion |
| 5  | Transition entre scènes (fondu)                     | 🟢 Polish |

#### Phase 5 — Polish & DX (~2h)

| #  | Tâche                                              | Impact    |
|----|----------------------------------------------------|-----------|
| 1  | Rendu Markdown des handouts                         | 🟡 UX     |
| 2  | Thème clair/sombre avec toggle                      | 🟡 UX     |
| 3  | Découpage du CSS monolithique                       | 🟢 DX     |
| 4  | Skeleton loaders pour les lazy components           | 🟢 Polish |
| 5  | Toast system (remplace MessageDock)                 | 🟡 UX     |
| 6  | Tooltips stylisés (remplace `title=""` natif)       | 🟢 Polish |

**Total estimé : ~14h.** Priorité de développement : 1) Refaire les onglets GM, 2) Session Live comme cockpit principal, 3) Panneaux standardisés, 4) Notes MJ, 5) Résumé du groupe, 6) Initiative, 7) Bibliothèque tokens, 8) Inspecteur de visibilité, 9) Actions rapides, 10) États/conditions — **les items 4-10 sont terminés (GM-2C/D/E/F/G + GM-3A/B/C/D).**

---

## 6. Checklist de test

### 6.1 Préparation

1. Ouvrir l'application
2. Se connecter
3. Ouvrir une campagne avec au moins une scène
4. Créer au moins deux tokens
5. Aller dans Session Live
6. Faire Ctrl+F5 (rafraîchissement complet)

**Nettoyage localStorage optionnel (console navigateur) :**

```js
Object.keys(localStorage)
  .filter((key) => key.startsWith("dnd-floating-widget:"))
  .forEach((key) => localStorage.removeItem(key));
location.reload();
```

### 6.2 Matrice de test par panneau

Pour chaque panneau actif, exécuter ces actions et vérifier le comportement :

| #  | Action                                      | Résultat attendu                                    |
|----|---------------------------------------------|-----------------------------------------------------|
| 1  | Ouvrir depuis le menu Panneaux              | Le panneau apparaît, un seul header, pas d'erreur   |
| 2  | Réduire (−)                                 | Le panneau se minimise dans le dock                 |
| 3  | Rouvrir depuis le dock                      | Le panneau réapparaît à sa position précédente      |
| 4  | Fermer (×)                                  | Le panneau disparaît, accessible via le dock        |
| 5  | Rouvrir depuis le menu Panneaux             | Le panneau réapparaît correctement                  |
| 6  | Épingler (📌)                               | Le panneau reste visible après fermeture des autres |
| 7  | Détacher (mode flottant)                    | Le panneau devient draggable au-dessus de la carte  |
| 8  | Verrouiller (🔒)                            | Le panneau ne peut plus être déplacé                |
| 9  | Déverrouiller                               | Le panneau redevient déplaçable                     |
| 10 | Déplacer (drag du titre)                    | Le panneau suit le curseur, pas de saut             |
| 11 | Redimensionner (coin SE)                    | Le contenu s'adapte, pas de débordement             |

### 6.3 Tests de régression

| Test                                    | Vérification                                      |
|-----------------------------------------|---------------------------------------------------|
| `npx tsc --noEmit`                      | 0 erreur TypeScript                               |
| `npm run build`                         | Build Vite OK                                     |
| `bash scripts/check-gm-panels-current.sh` | Cohérence registre ↔ App.tsx                    |
| `bash scripts/check-gm-panel-css.sh`    | CSS des panneaux conforme                         |
| `cd backend && uv run pytest --tb=short -q` | Tous les tests backend passent               |
| `docker compose config --quiet`         | Configuration Docker valide                       |

### 6.4 Tests d'intégration manuels

| Scénario                                                   | Attendu                                    |
|------------------------------------------------------------|--------------------------------------------|
| Charger la page, créer une campagne, ajouter une scène     | Layout 3 colonnes, carte centrée           |
| Basculer entre les modes Session Live                      | Les panneaux visibles changent             |
| Ouvrir 3 panneaux, tous les fermer, les rouvrir un par un  | Chaque panneau retrouve son état           |
| Rafraîchir la page (F5)                                    | Les positions des panneaux sont conservées |
| Passer en mode focus map                                   | Sidebar + panneaux masqués, carte fullscreen |
| Quitter le mode focus map                                  | Restauration du layout précédent           |

---

## Architecture post-PanelRenderer (juin 2026)

### Contextes domaine

L'architecture a été découpée en 5 contextes React spécialisés (plus de prop-drilling monolithique) :

| Contexte | Fichier | Rôle |
|----------|---------|------|
| `WorkspaceStateContext` | `contexts/WorkspaceStateContext.tsx` | Données en lecture seule : campaigns, characters, scenes, tokens, handouts, encounters, members, rolls, invitations, user |
| `WorkspaceActionsContext` | `contexts/WorkspaceActionsContext.tsx` | Callbacks stables : handleQuickRoll, handleRoll, handleCreateHandout, handleMoveToken, handleToggleTokenHidden, loadCharacters, selectCampaign, etc. |
| `VttContext` | `contexts/VttContext.tsx` | État VTT : selectedTokenId, selectedSceneId, sceneTokens, loadCombatState, loadSceneTokens, loadVttState |
| `PanelContext` | `contexts/PanelContext.tsx` | UI des panneaux : isBusy, gmView, activeSessionLiveMode, liveModePanelIds, floating panels (fp.open/close/minimize), modals, logs |
| `SessionContext` | `contexts/SessionContext.tsx` | Session temps réel : wsRef, presenceCount, realtimeStatus, theme, toasts |

Ces contextes sont fournis par `GmWorkspaceProvider.tsx` et consommés par `GmWorkspace.tsx`, `GmDockedPanels.tsx` et `GmFloatingPanels.tsx`.

### PanelRenderer

Le rendu des panneaux est centralisé dans `panels/panelRenderer.tsx` (671 lignes) :
- Un switch/case mappe chaque `panelId` vers son composant lazy-loadé
- Les composants reçoivent leurs props depuis `GmPanelRenderProps` (construit à partir des contextes)
- `renderDockedPanel()` gère le rendu docké (avec bouton détacher si `detachable`)
- `GmFloatingPanels.tsx` réutilise le même `renderGmPanelContent()` pour les panneaux flottants

### Filtrage par mode

Les modes de session (Exploration, Combat, Roleplay, Quick-Prep, Minimal) sont définis dans `config/sessionLiveModes.ts`. Chaque mode liste les IDs de panneaux visibles via `SESSION_LIVE_PANEL_SETS`. Le filtre est appliqué dans `GmDockedPanels.tsx` via `getDockedPanelsForView()`.

---

## Références

| Document source                  | Contenu principal                                  |
|----------------------------------|----------------------------------------------------|
| `frontend-panels.md`             | Registre, inventaire, mapping IDs, modes, roadmap  |
| `frontend-improvement-plan.md`   | Analyse des problèmes, architecture flottante, phases |
| `gm-interface-action-plan.md`    | Onglets GM, règles panneaux, priorité développement |
| `gm-panel-stabilization.md`      | Passes de stabilisation, CSS commun, validation    |
| `gm-panel-test-matrix.md`        | Préparation et matrice de test navigateur          |
