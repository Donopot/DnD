# Refonte Interfaces MJ/Joueur — Plan d'implémentation

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Restructurer les interfaces pour une séparation claire des rôles avec des éléments partagés (carte) et des éléments exclusifs (outils MJ, panneaux joueur). Quand MJ et joueur sont sur la même campagne, ils partagent la carte mais voient des layouts différents.

**Architecture:**
- `CampaignMap` : composant central partagé par les deux rôles (grille, fond, tokens, zoom, pan, fog layer)
- `VttBoard` : wrap GM autour de CampaignMap (scène selector, création tokens, upload fond, floating widgets)
- `PlayerView` : utilise CampaignMap au lieu de PlayerMap, layout retravaillé
- GM workspace : sidebar compacte, map au centre, panneaux ancrables à droite

**Tech Stack:** React 19, TypeScript, CSS Grid, composants existants

**Conventions:** Voir `.hermes/developer-rules.md` — branches `feat/`, smoke tests Python, TDD.

---

## 🔍 Audit de l'existant

### Interface MJ (App.tsx — branche 7 « GM + campaign »)

**Layout actuel :**
```
┌──────────┬──────────────────────────────────────────────┐
│ Sidebar  │  Workspace                                    │
│          │  ┌─────────────────────────────────────────┐ │
│ Refresh  │  │ Topbar: user, status, presence          │ │
│ Logout   │  ├──────────────┬──────────────────────────┤ │
│          │  │ Nouvelle     │ Tables actives            │ │
│          │  │ campagne     │ (liste)                   │ │
│          │  ├──────────────┴──────────────────────────┤ │
│          │  │ Detail Panel (7 onglets)                │ │
│          │  │  Campagne | Préparation | Live |        │ │
│          │  │  Persos | Journal | Biblio | Params     │ │
│          │  │  ┌────────────────────────────────────┐ │ │
│          │  │  │ Contenu varie selon l'onglet       │ │ │
│          │  │  │ - VttBoard (carte + floating)      │ │ │
│          │  │  │ - CharacterPanel                  │ │ │
│          │  │  │ - SessionLogPanel                 │ │ │
│          │  │  │ - HandoutPanel                    │ │ │
│          │  │  │ - HomebrewPanel                   │ │ │
│          │  │  └────────────────────────────────────┘ │ │
│          │  └─────────────────────────────────────────┘ │
└──────────┴──────────────────────────────────────────────┘
```

**Problèmes :**
1. 🔴 Le formulaire « Nouvelle campagne » est visible même quand on est DÉJÀ dans une campagne (devrait être dans GmLobby uniquement)
2. 🔴 « Tables actives » (liste des campagnes) occupe un panneau complet — devrait être dans la sidebar
3. 🔴 7 onglets dans le panneau de détail, dont VttBoard et SessionLogPanel qui sont des composants LOURDS (1180 + 500 lignes) jamais visibles simultanément mais tous dans le DOM
4. 🟡 VttBoard a sa propre barre d'outils, ses propres floating widgets, mais le SessionLiveMode bar est dans App.tsx, pas dans VttBoard
5. 🟡 Les floating widgets (InitiativePanel, QuickActionsPanel, VisibilityInspectorPanel, TokenDetailPanel, PartySummaryPanel, GmNotesPanel) sont tous dans VttBoard, pas accessibles depuis les autres onglets

**Ce qui doit être EXCLUSIF au MJ :**
- Création de scènes
- Upload d'assets / fonds de scène
- Création/déplacement de tokens
- Édition du Fog of War (outils de révélation)
- Gestion du combat (initiative, conditions, KO)
- Création/partage de handouts
- Bibliothèque homebrew
- Notes privées MJ
- Invitations joueurs
- Membres et rôles

### Interface Joueur (PlayerView)

**Layout actuel :**
```
┌─────────────────────────────────────────────────┐
│ Header: campagne, présence, user, logout        │
├─────────────────────────────────────────────────┤
│ Tab bar: Persos | Carte | Dés | Docs | Combat | Journal │
├─────────────────────────────────────────────────┤
│ Contenu de l'onglet actif (pleine largeur)       │
│ - PlayerMap (scènes, tokens, fog, zoom)          │
│ - EditCharacterSheet                             │
│ - Dice roller                                    │
│ - Handouts read-only                             │
│ - Combat read-only                               │
│ - Journal (notes + log)                          │
└─────────────────────────────────────────────────┘
```

**Problèmes :**
1. 🔴 `PlayerMap` est un composant SÉPARÉ de `VttBoard` — code dupliqué pour le rendu de la carte, grille, tokens, zoom, pan, fog
2. 🔴 Les tabs sont mutuellement exclusifs — le joueur ne peut pas voir la carte ET lancer des dés en même temps
3. 🟡 Layout linéaire (header → tabs → contenu) — pas de split view
4. 🟡 Pas de sélecteur de campagne si le joueur est dans plusieurs campagnes

**Ce qui doit être PARTAGÉ entre MJ et Joueur :**
- La carte (scène active, fond, tokens visibles, fog of war)
- Les positions des tokens
- Les mises à jour temps réel (WebSocket)

**Ce qui doit être EXCLUSIF au Joueur :**
- Création de SON personnage (pas de tous les persos)
- Jets de dés (avec avantage/désavantage)
- Écriture de notes publiques
- Consultation des handouts révélés
- Consultation de l'état du combat (read-only)
- Import/Export de sa fiche

---

## 📐 Nouvelle architecture proposée

### 1. CampaignMap — Composant central partagé

```
┌──────────────────────────────────────────────────────┐
│ [Toolbar: dépend du rôle]                             │
│  MJ: [Scène ▼] [Créer scène] [Ajouter token] [...]  │
│  Joueur: [Scène ▼] [Zoom -] [100%] [Zoom +]         │
├──────────────────────────────────────────────────────┤
│                                                       │
│              CANVAS DE LA CARTE                       │
│   ┌───────────────────────────────────────────┐      │
│   │  Grille + Fond + Tokens + Fog Layer       │      │
│   │                                           │      │
│   │  Interaction:                             │      │
│   │  - Zoom (molette)                         │      │
│   │  - Pan (drag / middle-click)              │      │
│   │  - MJ: drag tokens, reveal fog            │      │
│   │  - Joueur: lecture seule                  │      │
│   └───────────────────────────────────────────┘      │
│                                                       │
└──────────────────────────────────────────────────────┘
```

Extrait de VttBoard — tout le code de rendu canvas (grid, background, tokens, zoom, pan, fog).

Props :
```ts
type CampaignMapProps = {
  campaignId: string;
  token: string;
  scenes: Scene[];
  selectedScene: Scene | undefined;
  selectedSceneId: string;
  sceneTokens: SceneToken[];
  sceneBackgroundObjectUrl: string;
  characters: Character[];
  isGM: boolean;  // contrôle les outils disponibles
  // GM-only
  onCreateScene?: (e: FormEvent) => void;
  onCreateToken?: (e: FormEvent) => void;
  onMoveToken?: (token: SceneToken, dx: number, dy: number) => void;
  onSetSceneBackground?: () => void;
  assets?: Asset[];
  selectedAssetId?: string;
  onSelectAsset?: (assetId: string) => void;
  onSelectScene?: (sceneId: string) => void;
  // Player-only
  wsRef?: MutableRefObject<WebSocket | null>;
};
```

### 2. Interface MJ en campagne — Layout retravaillé

```
┌──────────┬──────────────────────────────┬───────────────────┐
│ Sidebar  │  MAP (CampaignMap)           │  Panneaux droits  │
│          │                              │  (ancrables)      │
│ Campagnes│  ┌─────────────────────────┐ │                   │
│ ▼ Liste  │  │                         │ │  👤 Personnages   │
│ - Table1 │  │    Carte + Tokens       │ │  ⚔️ Combat       │
│ - Table2 │  │    + Fog + Zoom/Pan     │ │  🎲 Dés          │
│          │  │                         │ │  📄 Handouts     │
│ Membres  │  │                         │ │  📚 Biblio       │
│ - User1  │  │                         │ │  📋 Journal      │
│ - User2  │  │                         │ │                   │
│          │  └─────────────────────────┘ │                   │
│ Inviter  │                              │                   │
│          │  [Barre mode session live]   │                   │
│ Logout   │  [explo | combat | rp | ...]│                   │
└──────────┴──────────────────────────────┴───────────────────┘
```

**Changements vs actuel :**
- ✅ Sidebar contient la liste des campagnes (compacte) + membres + bouton inviter → libère le workspace
- ✅ La carte est le centre de l'interface (pas cachée dans un onglet)
- ✅ Les panneaux droits sont les outils MJ (personnages, combat, dés, handouts, biblio, journal)
- ✅ La barre de mode session live est au-dessus ou en-dessous de la carte, pas dans un onglet séparé
- ❌ Suppression du panneau « Nouvelle campagne » de l'interface en-campagne
- ❌ Suppression du panneau « Tables actives » du workspace (→ sidebar)

### 3. Interface Joueur en campagne — Layout retravaillé

```
┌──────────────────────────────────────────────────────────┐
│ Header: [🏰 Campagne]  👤 user  🟢2 connectés  [Logout] │
├──────────────────────────────┬───────────────────────────┤
│  MAP (CampaignMap)           │  Panneaux joueur          │
│                              │                           │
│  ┌─────────────────────────┐ │  👤 Mon Perso            │
│  │                         │ │  (créer/éditer/export)   │
│  │    Carte + Tokens       │ │                           │
│  │    + Fog (read-only)    │ │  🎲 Dés                  │
│  │    + Zoom/Pan           │ │  (formule, avantage,     │
│  │                         │ │   jets par compétence)   │
│  │                         │ │                           │
│  │                         │ │  📄 Documents            │
│  │                         │ │  (handouts révélés)      │
│  └─────────────────────────┘ │                           │
│                              │  ⚔️ Combat               │
│  [Scène ▼] [Zoom]            │  (read-only)             │
│                              │                           │
│                              │  📋 Journal              │
│                              │  (notes + log public)    │
└──────────────────────────────┴───────────────────────────┘
```

**Changements vs actuel :**
- ✅ La carte est TOUJOURS visible (plus dans un onglet, toujours à gauche)
- ✅ Les panneaux joueur sont à droite, scrollables
- ✅ Le joueur peut voir la carte ET lancer des dés en même temps
- ✅ CampaignMap remplace PlayerMap (plus de code dupliqué)
- ✅ Le sélecteur de scène + zoom sont dans la barre sous la carte

---

## 📋 Tâches — Phase 19b : Refonte Interfaces

### Phase 1 — Extraction de CampaignMap

#### Task 1.1: Créer CampaignMap.tsx à partir de VttBoard

**Objective:** Extraire le rendu canvas (grid, background, tokens, zoom, pan, fog) de VttBoard dans un composant partagé.

**Files:**
- Create: `frontend/src/components/CampaignMap.tsx`
- Modify: `frontend/src/components/VttBoard.tsx` (utilise CampaignMap)

**Étapes détaillées :**

1. Créer `CampaignMap.tsx` avec :
   - Rendu du canvas : grille, image de fond, tokens (positionnés avec coordonnées), FogLayer
   - Gestion du zoom (molette) et pan (drag)
   - Props `isGM` pour conditionner les interactions
   - Si GM : handlers `onTokenDrag`, `onFogReveal`, `onCreateToken`
   - Si Player : lecture seule, pas de drag, fog readonly
   - Props communes : `campaignId`, `token`, `selectedScene`, `sceneTokens`, `sceneBackgroundObjectUrl`, `characters`

2. Modifier `VttBoard.tsx` :
   - Remplacer le bloc canvas interne par `<CampaignMap isGM={true} ... />`
   - Garder les floating widgets, les toolbars, le sélecteur de scène
   - Passer les handlers GM en props

3. Modifier `PlayerView.tsx` :
   - Remplacer `<PlayerMap ... />` par `<CampaignMap isGM={false} ... />`
   - Supprimer l'import de PlayerMap (le fichier reste mais n'est plus utilisé)

**Vérification :** TSC 0 erreur, Vite build OK.

#### Task 1.2: Nettoyer PlayerMap (obsolète après 1.1)

Marquer `PlayerMap.tsx` comme déprécié (garder le fichier pour référence, mais retirer son import de PlayerView).

---

### Phase 2 — Restructuration interface MJ en campagne

#### Task 2.1: Nouveau layout GM — sidebar + map + panneaux droits

**Objective:** Remplacer le layout workspace-grid+onglets par un layout 3 colonnes : sidebar | map | panneaux droits.

**Files:**
- Modify: `frontend/src/App.tsx` (bloc branche 7, lignes ~1140-1457)

**Nouveau layout :**
```tsx
// ── GM in-campaign layout ──────────────────────────────
return (
  <main className="gm-campaign-shell">
    {/* Sidebar gauche — compacte */}
    <aside className="gm-sidebar">
      <div className="brand-mark compact">
        <Swords /> DnD
      </div>
      
      {/* Liste compacte des campagnes */}
      <div className="gm-campaign-list-compact">
        <h4>Mes tables</h4>
        {campaigns.map(c => (
          <button className={...} onClick={...}>{c.name}</button>
        ))}
      </div>
      
      {/* Membres */}
      <div className="gm-members-compact">
        <h4>Membres</h4>
        {members.map(m => <div>{m.display_name} · {m.role}</div>)}
      </div>
      
      {/* Actions */}
      <button onClick={handleCreateInvite}>Inviter un joueur</button>
      <button onClick={logout}>Sortir</button>
    </aside>
    
    {/* Centre — Carte */}
    <section className="gm-map-area">
      <div className="gm-map-topbar">
        <span>{selectedCampaign.name}</span>
        <span className="realtime-pill">{realtimeStatus}</span>
        <span>{presenceCount} connectés</span>
      </div>
      
      {/* Barre mode session */}
      <SessionLiveModeBar 
        activeMode={activeSessionLiveMode}
        onModeChange={setActiveSessionLiveMode}
      />
      
      {/* CampaignMap avec contrôles GM */}
      <CampaignMap
        isGM={true}
        campaignId={selectedCampaign.id}
        token={token}
        scenes={scenes}
        selectedScene={selectedScene}
        selectedSceneId={selectedSceneId}
        sceneTokens={sceneTokens}
        sceneBackgroundObjectUrl={sceneBackgroundObjectUrl}
        characters={characters}
        // GM handlers
        onSelectScene={setSelectedSceneId}
        onCreateScene={handleCreateScene}
        onCreateToken={handleCreateToken}
        onMoveToken={(t, dx, dy) => void handleMoveToken(t, dx, dy)}
        onSetSceneBackground={() => void handleSetSceneBackground()}
        assets={assets}
        selectedAssetId={selectedAssetId}
        onSelectAsset={setSelectedAssetId}
      />
    </section>
    
    {/* Droite — Panneaux ancrables */}
    <aside className="gm-panels">
      <GmPanelTabs />  {/* Onglets: Persos, Combat, Dés, Handouts, Biblio, Journal */}
      {/* Contenu selon l'onglet actif */}
      {activeGmPanel === "characters" && <CharacterPanel ... />}
      {activeGmPanel === "combat" && <CombatPanel ... />}
      {activeGmPanel === "dice" && <SessionLogPanel ... />}
      {activeGmPanel === "handouts" && <HandoutPanel ... />}
      {activeGmPanel === "library" && <HomebrewPanel ... />}
      {activeGmPanel === "journal" && <SessionLogPanel ... />}
    </aside>
  </main>
);
```

**CSS à ajouter :**
- `.gm-campaign-shell` — CSS Grid 3 colonnes : `250px 1fr 320px`
- `.gm-sidebar` — fond foncé, overflow-y auto
- `.gm-map-area` — flex column, la carte prend tout l'espace
- `.gm-panels` — fond foncé, onglets + contenu scrollable
- SessionLiveModeBar extrait dans un composant ou inline dans `.gm-map-topbar`

#### Task 2.2: Extraire SessionLiveModeBar en composant

**Files:**
- Create: `frontend/src/components/SessionLiveModeBar.tsx`
- Modify: `frontend/src/App.tsx` (supprimer le bloc inline, utiliser le composant)

#### Task 2.3: Supprimer le formulaire « Nouvelle campagne » de l'interface en-campagne

**Objective:** Ce formulaire est déjà dans GmLobby, il ne doit pas apparaître quand on est en campagne.

**Files:**
- Modify: `frontend/src/App.tsx` (supprimer le bloc « Nouvelle campagne » du return GM)

---

### Phase 3 — Restructuration interface Joueur en campagne

#### Task 3.1: Nouveau layout PlayerView — map à gauche, panneaux à droite

**Objective:** Remplacer le layout tabs+contenu par un split view map | panneaux.

**Files:**
- Modify: `frontend/src/components/PlayerView.tsx`

**Changements :**
1. Remplacer `<PlayerMap>` par `<CampaignMap isGM={false}>`
2. Transformer les tabs en panneaux verticaux à droite (toujours visibles, scrollables)
3. La partie gauche = CampaignMap (toujours visible)
4. La partie droite = 4 sections empilées : Persos, Dés, Documents/Combat/Journal

```tsx
return (
  <main className="player-campaign-shell">
    {/* Header */}
    <header className="player-topbar">
      <span>{campaign.name}</span>
      <span className="realtime-pill">{realtimeStatus}</span>
      <span>{presenceCount} connectés</span>
      <span>{userDisplayName}</span>
      <button onClick={onLogout}>Sortir</button>
    </header>
    
    <div className="player-workspace">
      {/* Carte à gauche */}
      <section className="player-map-area">
        <CampaignMap
          isGM={false}
          campaignId={cid}
          token={token}
          scenes={playerScenes}
          selectedScene={playerScene}
          selectedSceneId={playerScene?.id ?? ""}
          sceneTokens={playerTokens}
          sceneBackgroundObjectUrl={playerBgUrl}
          characters={characters}
          onSelectScene={(id) => ...}
          wsRef={wsRef}
        />
      </section>
      
      {/* Panneaux à droite */}
      <aside className="player-panels">
        {/* Mon personnage */}
        <section className="player-panel-section">
          <h3>👤 Mon personnage</h3>
          {charactersTab}
        </section>
        
        {/* Dés */}
        <section className="player-panel-section">
          <h3>🎲 Dés</h3>
          {diceTab}
        </section>
        
        {/* Documents */}
        <section className="player-panel-section">
          <h3>📄 Documents</h3>
          {handoutsTab}
        </section>
        
        {/* Combat */}
        <section className="player-panel-section">
          <h3>⚔️ Combat</h3>
          {combatTab}
        </section>
        
        {/* Journal */}
        <section className="player-panel-section">
          <h3>📋 Journal</h3>
          {journalTab}
        </section>
      </aside>
    </div>
  </main>
);
```

**CSS à ajouter :**
- `.player-campaign-shell` — flex column, 100vh
- `.player-topbar` — barre horizontale (campagne, présence, user, logout)
- `.player-workspace` — flex row, flex: 1
- `.player-map-area` — flex: 1, contient CampaignMap
- `.player-panels` — width 340px, overflow-y auto, scrollable
- `.player-panel-section` — section collapsible ou toujours visible

#### Task 3.2: PlayerView — utiliser les données de scène partagées

**Objective:** CampaignMap a besoin de `scenes`, `selectedScene`, `sceneTokens`, `sceneBackgroundObjectUrl`. PlayerView doit charger ces données comme PlayerMap le faisait.

**Files:**
- Modify: `frontend/src/components/PlayerView.tsx`

Ajouter les states et loaders pour les scènes (déjà dans PlayerMap, à remonter dans PlayerView).

---

### Phase 4 — CSS & Responsive

#### Task 4.1: CSS pour les nouveaux layouts

**Files:**
- Modify: `frontend/src/styles.css`

Classes à ajouter :
- `.gm-campaign-shell`, `.gm-sidebar`, `.gm-map-area`, `.gm-panels`, `.gm-campaign-list-compact`, `.gm-members-compact`
- `.player-campaign-shell`, `.player-topbar`, `.player-workspace`, `.player-map-area`, `.player-panels`, `.player-panel-section`
- Media queries pour écrans < 1024px (empiler verticalement)

#### Task 4.2: Responsive — layout vertical sur mobile/tablette

Sur écran < 1024px :
- GM : sidebar → barre horizontale en haut, map → pleine largeur, panneaux → en-dessous
- Player : topbar → barre horizontale, map → pleine largeur, panneaux → en-dessous

---

### Phase 5 — Build, tests, smoke

#### Task 5.1: Vérifier TSC + Vite build

```bash
cd frontend && npx tsc --noEmit && npx vite build
```

#### Task 5.2: Tests backend

```bash
cd backend && .venv/bin/pytest tests/ -q
```

#### Task 5.3: Smoke tests manuels

Vérifier les 6 parcours de la règle de non-régression auth (section 8 de developer-rules.md).

---

### Phase 6 — Documentation

- CHANGELOG : entrée Phase 19b
- README : mise à jour composants, layout description
- roadmap : mettre à jour l'état

---

## 📊 Estimation

| Phase | Contenu | Fichiers | Lignes estimées |
|-------|---------|----------|-----------------|
| 1. CampaignMap | Extraction de VttBoard | 1 créé, 2 modifiés | +200 / -150 |
| 2. Layout GM | Refonte App.tsx | 1 modifié, 1 créé | +80 / -200 |
| 3. Layout Player | Refonte PlayerView | 1 modifié | +100 / -80 |
| 4. CSS | +2 layouts + responsive | 1 modifié | +350 |
| 5. Tests | TSC + Vite + pytest | — | — |
| 6. Doc | CHANGELOG, README | 3 modifiés | +50 |

**Total estimé :** ~3-4 commits, 2 nouveaux composants, 5 fichiers modifiés

---

## 🎯 Résultat attendu

Après cette phase, le projet aura :

1. **Une carte unique** (`CampaignMap`) utilisée par les deux rôles — plus de duplication `VttBoard`/`PlayerMap`
2. **Une interface MJ claire** : sidebar compacte (campagnes, membres, inviter) + map centrale + panneaux outils à droite
3. **Une interface Joueur immersive** : map toujours visible à gauche + panneaux joueur à droite (perso, dés, docs, combat, journal)
4. **Temps réel partagé** : quand le MJ bouge un token ou change de scène, le joueur le voit immédiatement sur la même carte
5. **Plus de « mélange de tout »** : chaque rôle voit exactement ce dont il a besoin
