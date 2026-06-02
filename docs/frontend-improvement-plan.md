# Plan d'Amélioration Frontend — DnD Virtual Tabletop

**Date :** 1er juin 2026  
**Version :** 1.0  
**Contexte :** Revue exhaustive des 1104 lignes d'App.tsx, 1094 lignes de PlayerView.tsx, 45 composants TypeScript,  
11 855 lignes de CSS, backend WebSocket (session.py + realtime.py), et routes API.

---

## Synthèse des constats

| Métrique | Valeur |
|----------|--------|
| Composants TSX | 45 |
| CSS (1 fichier) | 11 855 lignes |
| Modules Vite | 1 766 |
| Bundle principal | 295 kB |
| Layout GM | Grid 3 colonnes (210px \| 1fr \| 320px) — fixe, pas de floating |
| Layout Joueur | Flex (map \| panneaux 340px) — empilé en mobile |
| Panneaux GM | 11 `<details>` accordéons, pas redimensionnables |
| Fond de carte Joueur | **BUG** : `sceneBackgroundObjectUrl=""` hardcodé → jamais chargé |

---

## Problèmes critiques identifiés (par sévérité)

### 🔴 CRITIQUE — Bloque l'usage

#### C1. Fond de carte jamais chargé côté joueur
**Fichier :** `PlayerView.tsx:1069`  
```tsx
sceneBackgroundObjectUrl={""}  // hardcodé — devrait charger le blob URL
```
- Le joueur voit une carte noire/grid sans le fond d'image de la scène.
- Le code de chargement existe dans `App.tsx:122-160` (blob→objectURL) mais n'est pas dupliqué côté PlayerView.
- **Correction :** Extraire la logique de chargement de background dans un hook `useSceneBackground(scene, token)` et l'utiliser dans PlayerView.

#### C2. La carte n'est pas centrée à l'écran — pas de mode "focus map"
- Layout GM : 210px sidebar + 320px panneaux = 530px de chrome non-map → la carte n'occupe que `viewport_width - 530px`.
- Aucun mécanisme pour cacher les panneaux et mettre la carte en plein écran.
- Le scroll de la carte démarre en (0,0) sans centrage automatique.

#### C3. Aucun panneau flottant — tout est fixe
- Les 11 sections du panneau GM sont des `<details>` dans une sidebar scrollable de 320px.
- Impossible de déplacer le Combat Tracker ou le Dice Roller au-dessus de la carte.
- Le DiceRoller (lazy-loaded) est coincé dans un accordéon — le MJ doit scroller pour y accéder.

#### C4. Pas de redimensionnement des panneaux
- Les 3 colonnes ont des largeurs fixes (210px / 1fr / 320px).
- Aucun resize handle. Sur un écran 1366×768, la carte ne fait que ~836px de large.

#### C5. La sidebar joueur est monolithique — pas d'onglets
- `PlayerView.tsx` : 5 sections (personnages, dés, documents, combat, journal) rendues séquentiellement dans une scrollbar de 340px.
- Sur mobile, tout s'empile sous la carte sans aucune navigation tabulaire.

---

### 🟠 MAJEUR — Dégradation de l'expérience

#### M1. Les boutons "Session Live Mode" ne changent rien au layout
- `gm-map-topbar` affiche exploration/combat/rôle/quick-prep → `activeSessionLiveMode` est un state… qui n'est consommé par rien d'autre.
- C'est purement cosmétique. Un mode "combat" devrait faire apparaître le Combat Tracker en overlay sur la carte.

#### M2. Pas de mode plein écran pour la carte
- Aucun raccourci clavier (F11, Ctrl+M) ou bouton pour masquer sidebar + panneaux.

#### M3. La barre d'outils MapTools est inaccessible pour les joueurs
- Les boutons ping/règle sont visibles mais le `isGM={false}` désactive tout le panel d'outils.
- Seul le pan+zoom fonctionnent pour les joueurs. Ils ne peuvent ni ping, ni mesurer.

#### M4. Le thème est figé — pas de light mode
- Tout est en fond `#0f1923` avec du texte `#e0dcc8`. Pas de toggle dark/light.
- Les joueurs qui veulent imprimer ou lire les handouts souffrent.

#### M5. La sidebar GM n'a pas de sections repliables
- `gm-sidebar` affiche TOUJOURS "Mes tables" + "Membres" + boutons. Pas de collapse.
- Sur un écran 1366px, ça fait 210px de largeur gaspillée quand le MJ a une seule campagne.

#### M6. La scène active n'est pas visuellement prioritaire
- Le sélecteur `<select>` dans la toolbar montre toutes les scènes mais sans indication visuelle de quelle est "active".

#### M7. Pas de minimap
- Sur les grandes cartes (ex: 4000×3000), le joueur/MJ n'a aucun repère spatial → se perd facilement.

---

### 🟡 MODÉRÉ — Améliorations d'ergonomie

#### D1. Le message dock est minuscule
- `MessageDock` affiche un `<p>` tout en bas. Les erreurs importantes passent inaperçues.
- Devrait être un toast temporaire (3-5s) ou une notification dans le header.

#### D2. Pas de drag-and-drop pour réorganiser les panneaux
- L'ordre des accordéons est fixé en dur dans `App.tsx:913-1081`.
- Impossible pour un MJ de mettre "Combat" en premier ou de cacher "Règles".

#### D3. Pas de raccourcis clavier
- Pas de `Space` pour pan, `G` pour toggle grid, `F` pour fullscreen map, `1-9` pour outils rapides.

#### D4. Les handouts utilisent `<pre>` pour le contenu
- `HandoutPanel.tsx` et `PlayerView.tsx:927` utilisent `<pre className="handout-content">` 
- Aucun rendu Markdown → les handouts avec formatting sont illisibles.

#### D5. Les tokens sur la carte n'ont pas d'état visuel
- Pas d'état "bloodied" (rouge à 50% HP), "incapacité" (gris), "concentration" (glow).
- Les HP bars sont présentes mais uniquement en barre fine — pas de compteur numérique.

#### D6. Le WYSIWYG des dés joueur est basique
- Dans `PlayerView.tsx`, le dice roller est un `<input>` texte + mode select. 
- Pas de dés 3D, pas d'animation, pas de "clic rapide d20".

#### D7. La page lobby est trop austère
- `PlayerLobby` et `GmLobby` : fond sombre + texte centré + formulaire. Pas d'illustration, pas de "dernières campagnes", pas de quickstart.

#### D8. Le CSS est un seul fichier monolithique (11 855 lignes)
- Devrait être découpé en `styles/map.css`, `styles/panels.css`, `styles/auth.css`, etc.

#### D9. Les composants lazy-loadés n'ont pas de fallback de bonne qualité
- `PanelFallback` = `⚡ Chargement…`. Pas de skeleton, pas de spinner animé.

#### D10. Aucun undo pour le drag de token
- Quand le MJ déplace un token par erreur, pas de Ctrl+Z → doit re-déplacer manuellement.

#### D11. Pas de grille de snap visible
- Le snap-to-grid fonctionne (dans `CampaignMap.tsx:152`) mais la grille n'est visible que quand `showGrid=true`. 
- Quand on drag, on devrait voir un aimant visuel (ligne pointillée ou highlight de la cellule).

#### D12. Les noms de tokens débordent sur les petits tokens
- `.token-nameplate` est positionnée en dessous du token mais sans `overflow: hidden` ni `text-overflow: ellipsis`.

---

### 🟢 COSMÉTIQUE — Polish visuel

#### P1. Les icônes Lucide sont chargées individuellement — pas de tree-shaking
- `App.tsx` importe `DoorOpen, Plus, Swords, UserPlus` séparément → OK.
- Mais certains composants importent 10+ icônes (PlayerView en importe 12) → bundle plus gros.

#### P2. Les transitions CSS sont absentes sur les changements de scène
- Changement de scène = zoom reset, scroll reset → pas d'animation de transition (fondu ou zoom out/in).

#### P3. Le compteur de présence est trop discret
- `presenceCount` est affiché en petit dans la topbar.

#### P4. Les tooltips sont en `title` HTML natif — pas de tooltip stylisé
- Tous les `title="..."` sont des tooltips navigateur jaunes basiques.

---

## Plan d'amélioration priorisé

### Phase 1 — Correctifs critiques (maintenant) ⏱️ ~2h

| # | Tâche | Impact |
|---|-------|--------|
| 1.1 | **Fix fond de carte joueur** : extraire `useSceneBackground(scene, token)` dans un hook partagé, l'utiliser dans PlayerView | 🔴 Bloquant |
| 1.2 | **Centrage automatique de la carte** : au chargement, scroller au centre de la scène (`scrollLeft = (width*vw)/2`, `scrollTop = (height*vh)/2`) | 🔴 UX |
| 1.3 | **Mode focus map** : bouton dans la topbar pour cacher sidebar + panneaux et mettre la carte en `position:fixed; inset:0` | 🔴 UX |
| 1.4 | **Resize handles entre les colonnes** : `resize: horizontal` sur sidebar et panneaux, avec `min-width`/`max-width` | 🟠 UX |

### Phase 2 — Panneaux flottants (important) ⏱️ ~4h

| # | Tâche | Impact |
|---|-------|--------|
| 2.1 | **Système de panneaux flottants** : wrapper `FloatingPanel` avec drag (titre), resize (coin), minimize, close. Persistance en localStorage. | 🟠 Core |
| 2.2 | **Convertir CombatTracker en panneau flottant** : option "détacher" → apparaît en overlay draggable sur la carte | 🟠 UX |
| 2.3 | **Convertir DiceRoller en panneau flottant** : idem, avec option "ancré" vs "flottant" | 🟠 UX |
| 2.4 | **Convertir EncounterBuilder en panneau flottant** | 🟡 Nice-to-have |
| 2.5 | **Bouton "Cacher tous les panneaux"** : bascule rapide dans la topbar | 🟠 UX |
| 2.6 | **Drag-and-drop réorganisation des panneaux** : dans la sidebar, pouvoir réordonner les `<details>` par drag | 🟡 UX |

### Phase 3 — Interface joueur refondue ⏱️ ~3h

| # | Tâche | Impact |
|---|-------|--------|
| 3.1 | **Système d'onglets dans la sidebar joueur** : remplacer le scroll monolithique par des tabs (👤 📊 🎲 📄 ⚔️) avec `role="tablist"` | 🟠 UX |
| 3.2 | **Dice roller joueur amélioré** : boutons d20 rapides, animations CSS, résultat en overlay sur la carte | 🟡 UX |
| 3.3 | **Rendre les outils MapTools accessibles aux joueurs** : ping + règle uniquement (pas AoE), broadcast comme le MJ | 🟠 UX |
| 3.4 | **Notifications combat en overlay** : quand le round change ou condition appliquée, toast sur la carte | 🟡 UX |

### Phase 4 — Carte immersive ⏱️ ~3h

| # | Tâche | Impact |
|---|-------|--------|
| 4.1 | **Minimap** : petit canvas 160×120 en bas à droite de la carte avec rectangle de viewport | 🟡 UX |
| 4.2 | **Raccourcis clavier** : `Space`=pan, `G`=grid toggle, `F`=fullscreen, `1-4`=ping/ruler/AoE/drag, `Ctrl+Z`=undo token move | 🟡 UX |
| 4.3 | **Snap visuel pendant le drag** : ligne pointillée ou highlight de la cellule cible | 🟡 Polish |
| 4.4 | **Indicateur d'état sur les tokens** : glow rouge (bloodied <50% HP), overlay gris (incapacité/defeated), étoile (concentration) | 🟡 Immersion |
| 4.5 | **Transition entre scènes** : fondu 300ms + zoom out/in au changement de scène | 🟢 Polish |

### Phase 5 — Polish et DX ⏱️ ~2h

| # | Tâche | Impact |
|---|-------|--------|
| 5.1 | **Rendu Markdown des handouts** : utiliser `marked` ou `react-markdown` pour les contenus de handouts | 🟡 UX |
| 5.2 | **Thème clair/sombre** : toggle dans le header, CSS variables, persister en localStorage | 🟡 UX |
| 5.3 | **Découpage du CSS** : `styles/map.css`, `styles/panels.css`, `styles/auth.css`, `styles/lobby.css` → réduire le fichier monolithique | 🟢 DX |
| 5.4 | **Skeleton loaders** pour les lazy components : remplacer `⚡ Chargement…` par un placeholder animé | 🟢 Polish |
| 5.5 | **Toast system** : remplacer `MessageDock` par des toasts temporaires (3s) + stack | 🟡 UX |
| 5.6 | **Icon sprite** : utiliser `lucide-react` dynamique pour réduire le bundle | 🟢 DX |
| 5.7 | **Tooltips stylisés** : remplacer `title=""` par un composant `<Tooltip>` avec `@floating-ui` | 🟢 Polish |

---

## Architecture proposée pour les panneaux flottants

```
FloatingPanelSystem
├── useFloatingPanels()          // Hook: positions, visibility, z-index stack
│   ├── panels: Map<id, PanelState>
│   ├── open(component, config)
│   ├── close(id)
│   ├── minimize(id)
│   └── persist() → localStorage
│
├── FloatingPanel                // Composant wrapper
│   ├── DragHandle (titre bar)
│   ├── ResizeHandle (coin SE)
│   ├── Minimize / Close buttons
│   ├── Snap-to-edges
│   └── Double-clic titre → maximise
│
└── PanelOverlay                 // Conteneur z-index au-dessus de la carte
    └── {panels.map(p => <FloatingPanel key={p.id} {...p} />)}
```

---

## Calendrier estimé

| Phase | Contenu | Durée | Priorité |
|-------|---------|-------|----------|
| **1** | Correctifs critiques | 2h | 🔴 Immédiat |
| **2** | Panneaux flottants | 4h | 🟠 Cette semaine |
| **3** | Interface joueur | 3h | 🟠 Cette semaine |
| **4** | Carte immersive | 3h | 🟡 Semaine prochaine |
| **5** | Polish & DX | 2h | 🟢 Quand dispo |

**Total : ~14h de travail**

---

## Exemples visuels des améliorations clés

### Avant / Après — Carte
```
AVANT :
┌──────────┬─────────────────────────────┬──────────┐
│ Sidebar  │                             │ Panneaux │
│ 210px    │     CARTE (reste)           │ 320px    │
│ fixe     │     pas centrée             │ accord.  │
└──────────┴─────────────────────────────┴──────────┘

APRÈS (mode focus) :
┌───────────────────────────────────────────────────┐
│ [☰] Scène: Donjon __________ [🗺️] [⚔️] [🎲] [X] │ ← topbar flottante
│                                                   │
│                                                   │
│               CARTE PLEIN ÉCRAN                   │
│               centrée + minimap                   │
│                                                   │
│                                        ┌────┐     │
│                                        │Mini│     │
│                                        │map │     │
│                                        └────┘     │
└───────────────────────────────────────────────────┘

APRÈS (mode normal avec panneaux flottants) :
┌──────┬────────────────────────────────────────────┐
│ Side │                                   ┌───────┐│
│ bar  │          CARTE                    │Combat ││ ← panneau flottant
│210px │          centrée                  │Tracker││   déplaçable
│      │                                   └───────┘│
│      │                          ┌──────┐          │
│      │                          │ Dés  │          │
│      │                          └──────┘          │
└──────┴────────────────────────────────────────────┘
```

### Avant / Après — Interface joueur
```
AVANT (scroll monolithique) :
┌──────────────────────┬───────────┐
│                      │ Personnage│
│       CARTE          │ Formulaire│
│                      │ QuickRoll │
│                      │ Compétence│
│                      │── Créer ──│
│                      │   Dés     │
│                      │ Handouts  │
│                      │  Combat   │
│                      │  Journal  │
└──────────────────────┴───────────┘

APRÈS (onglets) :
┌──────────────────────┬───────────┐
│                      │[👤][🎲][📄][⚔️][📝]│ ← onglets
│       CARTE          ├───────────┤
│                      │           │
│                      │ Contenu   │ ← un seul panneau visible
│                      │ actif     │   à la fois
│                      │           │
└──────────────────────┴───────────┘
```

---

## Checklist de vérification par phase

Chaque phase validée si :
- ✅ `npm run tsc --noEmit` : 0 erreur
- ✅ `npm run build` (Vite) : build OK
- ✅ `cd backend && uv run pytest tests/ -q --tb=short` : tous les tests passent
- ✅ Test manuel : charger la page, créer une campagne, ajouter une scène, vérifier le layout
