# Plan : Réparation des panneaux orphelins et VTT manquants

> **Pour Hermes :** Utilise la convention lot-based (1 lot = 1 branche). Merge chaque lot avant de passer au suivant.

**Objectif :** Câbler les 8 composants existants mais orphelins + créer les 2 panneaux VTT manquants + ajouter un dock de panneaux flottants.

**Architecture :** Tout est frontend-only (React/TypeScript). Les composants cibles existent déjà côté fichiers — il faut juste les importer et les rendre dans `App.tsx` (sidebar droite ou floating panels). Aucune modif backend.

**Tech :** React 18 + TypeScript + Vite + lazy loading + CSS modules.

**Conventions :** Voir `writing-plans/references/dnd-vtt-conventions.md` — lazy loading, authHeaders, lot-based workflow, pré-commit baseline.

---

## 📦 Lot 1 — Panneaux scène en sidebar droite (onglet Préparation enrichi)

**Branche :** `feat/lot-1-vtt-scene-panels`

### Contexte
L'onglet "Préparation" n'a que 2 panneaux (Donjons + Documents). Il devrait contenir les outils de gestion de scène.

### Task 1.1 : Ajouter ScenePanel (création/gestion de scènes)

**Fichiers :**
- Créer : `frontend/src/components/ScenePanel.tsx`
- Modifier : `frontend/src/App.tsx` (lazy import + section `gmView === "preparation"`)

**Composant :**
```tsx
import { useState } from "react";
import type { Scene } from "../api/types";
import { authHeaders } from "../api/client";

type ScenePanelProps = {
  campaignId: string;
  scenes: Scene[];
  selectedSceneId: string;
  onSelectScene: (id: string) => void;
  onRefresh: () => void;
};

export default function ScenePanel({
  campaignId, scenes, selectedSceneId, onSelectScene, onRefresh,
}: ScenePanelProps) {
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  async function createScene() {
    if (!name.trim()) return;
    setBusy(true);
    const token = localStorage.getItem("dnd_access_token") || "";
    await fetch(`/api/campaigns/${campaignId}/scenes`, {
      method: "POST",
      headers: { ...authHeaders(token), "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim(), grid_size: 50, width: 1600, height: 1000 }),
    });
    setName("");
    setBusy(false);
    onRefresh();
  }

  return (
    <div>
      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.5rem" }}>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nouvelle scène..."
          maxLength={120}
          style={{ flex: 1 }}
        />
        <button disabled={busy || !name.trim()} onClick={createScene}>+</button>
      </div>
      <div className="scene-list">
        {scenes.map((s) => (
          <button
            key={s.id}
            className={s.id === selectedSceneId ? "active" : ""}
            onClick={() => onSelectScene(s.id)}
            style={{ display: "block", width: "100%", textAlign: "left", marginBottom: "0.25rem" }}
          >
            {s.is_active && "🟢 "}{s.name}
          </button>
        ))}
      </div>
    </div>
  );
}
```

**Dans App.tsx :**
1. Ajouter le lazy import (vers ligne 74) :
```tsx
const ScenePanel = lazy(() =>
  import("./components/ScenePanel").then((m) => ({ default: m.default })),
);
```

2. Dans `gmView === "preparation"` (après le DungeonGenerator, avant Handouts) :
```tsx
<details className="gm-panel-section" open>
  <summary>
    🎬 Scènes
    <button className="panel-detach-btn" onClick={(e) => { e.preventDefault(); e.stopPropagation(); fp.open("scene", "🎬 Scènes"); }} title="Détacher" type="button">
      <ExternalLink size={12} />
    </button>
  </summary>
  <ScenePanel
    campaignId={selectedCampaign?.id ?? ""}
    scenes={scenes}
    selectedSceneId={selectedSceneId}
    onSelectScene={(id) => { setSelectedSceneId(id); void loadSceneTokens(id); }}
    onRefresh={() => { if (selectedCampaign) void loadVttState(selectedCampaign.id); }}
  />
</details>
```

3. Ajouter le rendering floating panel (après `panel.id === "handouts"`, vers ligne 1581) :
```tsx
{panel.id === "scene" && (
  <ScenePanel
    campaignId={selectedCampaign?.id ?? ""}
    scenes={scenes}
    selectedSceneId={selectedSceneId}
    onSelectScene={(id) => { setSelectedSceneId(id); void loadSceneTokens(id); }}
    onRefresh={() => { if (selectedCampaign) void loadVttState(selectedCampaign.id); }}
  />
)}
```

**Vérification :**
- `npx tsc --noEmit` → 0 erreur
- `npm run build` → OK
- Dans l'UI : onglet Préparation → panneau "🎬 Scènes" visible, liste des scènes + champ de création

---

### Task 1.2 : Ajouter TokenPanel (gestion des tokens de scène)

**Fichiers :**
- Créer : `frontend/src/components/TokenPanel.tsx`
- Modifier : `frontend/src/App.tsx`

**Composant :**
```tsx
import { useState } from "react";
import type { Character, SceneToken } from "../api/types";
import { authHeaders } from "../api/client";

type TokenPanelProps = {
  sceneId: string;
  tokens: SceneToken[];
  characters: Character[];
  onRefresh: () => void;
};

export default function TokenPanel({ sceneId, tokens, characters, onRefresh }: TokenPanelProps) {
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  async function addToken() {
    if (!name.trim() || !sceneId) return;
    setBusy(true);
    const token = localStorage.getItem("dnd_access_token") || "";
    await fetch(`/api/scenes/${sceneId}/tokens`, {
      method: "POST",
      headers: { ...authHeaders(token), "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim(), x: 100, y: 100 }),
    });
    setName("");
    setBusy(false);
    onRefresh();
  }

  return (
    <div>
      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.5rem" }}>
        <input value={name} onChange={(e) => setName(e.target.value)}
          placeholder="Nom du token..." maxLength={120} style={{ flex: 1 }} />
        <button disabled={busy || !name.trim() || !sceneId} onClick={addToken}>+</button>
      </div>
      <div className="token-list">
        {tokens.length === 0 && <p className="muted">Aucun token sur cette scène.</p>}
        {tokens.map((t) => (
          <div key={t.id} className="token-row">
            <span>{t.is_hidden ? "👻 " : ""}{t.name}</span>
            <small>x:{t.x} y:{t.y} size:{t.size}</small>
          </div>
        ))}
      </div>
    </div>
  );
}
```

**Dans App.tsx :**
1. Lazy import :
```tsx
const TokenPanel = lazy(() =>
  import("./components/TokenPanel").then((m) => ({ default: m.default })),
);
```

2. Dans `gmView === "preparation"` :
```tsx
<details className="gm-panel-section">
  <summary>
    🎭 Tokens
    <button className="panel-detach-btn" onClick={(e) => { e.preventDefault(); e.stopPropagation(); fp.open("tokens", "🎭 Tokens"); }} title="Détacher" type="button">
      <ExternalLink size={12} />
    </button>
  </summary>
  <TokenPanel
    sceneId={selectedSceneId}
    tokens={sceneTokens}
    characters={characters}
    onRefresh={() => { if (selectedSceneId) void loadSceneTokens(selectedSceneId); }}
  />
</details>
```

3. Floating panel :
```tsx
{panel.id === "tokens" && (
  <TokenPanel
    sceneId={selectedSceneId}
    tokens={sceneTokens}
    characters={characters}
    onRefresh={() => { if (selectedSceneId) void loadSceneTokens(selectedSceneId); }}
  />
)}
```

**Vérification :** tsc → 0, build → OK, UI → panneau Tokens visible dans Préparation

---

### Task 1.3 : Mettre à jour le baseline pre-commit

**Fichier :** `scripts/pre-commit.sh`

**Modification :** Incrémenter `BASELINE` de +2 (ScenePanel + TokenPanel).

```bash
# Avant :
BASELINE=17
# Après :
BASELINE=19
```

**Vérification :** `bash scripts/audit-orphans.py` → 19

---

### Task 1.4 : Commit et PR Lot 1

```bash
git add frontend/src/components/ScenePanel.tsx frontend/src/components/TokenPanel.tsx frontend/src/App.tsx scripts/pre-commit.sh
git commit -m "feat: add scene and token management panels to preparation tab"
gh pr create --base main --title "Lot 1: Panneaux scène et tokens dans Préparation" --body "Ajoute ScenePanel (création/liste scènes) et TokenPanel (ajout/liste tokens) dans l'onglet Préparation."
gh pr merge --squash --delete-branch
```

---

## 📦 Lot 2 — Câblage des composants orphelins existants

**Branche :** `feat/lot-2-wire-orphan-components`

### Task 2.1 : Câbler TokenDetailPanel (floating panel)

**Fichiers :**
- Modifier : `frontend/src/App.tsx`

Le composant `TokenDetailPanel` existe déjà dans `frontend/src/components/TokenDetailPanel.tsx` (148 lignes). Il a besoin de :
- `selectedToken` / `selectedTokenCharacter` / `selectedTokenPosition` → pas encore gérés dans App.tsx
- `onCenterSelectedToken` / `onDeselectToken` / `onNudgeSelectedToken` → callbacks

**Approche simplifiée :** Ajouter un état `selectedTokenId` dans App.tsx, puis ouvrir TokenDetailPanel comme floating panel.

1. Ajouter le state dans App.tsx (vers ligne 130) :
```tsx
const [selectedTokenId, setSelectedTokenId] = useState<string>("");
```

2. Le composant n'est pas lazy-loaded (pas d'import lazy existant). Ajouter un import normal (non-lazy pour simplicité) ou lazy :
```tsx
import { TokenDetailPanel } from "./components/TokenDetailPanel";
```

3. Ajouter un bouton "Détail token" dans la sidebar live (après QuickActions) :
```tsx
<details className="gm-panel-section">
  <summary>
    🔍 Détail token
    <button className="panel-detach-btn" onClick={(e) => { e.preventDefault(); e.stopPropagation(); fp.open("token-detail", "🔍 Détail token"); }} title="Détacher" type="button">
      <ExternalLink size={12} />
    </button>
  </summary>
  <TokenDetailPanel
    selectedScene={selectedScene}
    selectedToken={sceneTokens.find((t) => t.id === selectedTokenId)}
    selectedTokenCharacter={characters.find((c) => c.id === sceneTokens.find((t) => t.id === selectedTokenId)?.character_id)}
    selectedTokenPosition={sceneTokens.find((t) => t.id === selectedTokenId) ? { x: sceneTokens.find((t) => t.id === selectedTokenId)!.x, y: sceneTokens.find((t) => t.id === selectedTokenId)!.y } : undefined}
    onCenterSelectedToken={() => {}}
    onDeselectToken={() => setSelectedTokenId("")}
    onNudgeSelectedToken={(dx, dy) => {
      const t = sceneTokens.find((t) => t.id === selectedTokenId);
      if (t) void handleMoveToken(t, dx, dy);
    }}
  />
</details>
```

**Vérification :** tsc → 0, build → OK

---

### Task 2.2 : Câbler VisibilityInspectorPanel

**Modifier :** `frontend/src/App.tsx`

Ajouter dans `gmView === "live"` (après Communication) :
```tsx
<details className="gm-panel-section">
  <summary>
    👁️ Visibilité
    <button className="panel-detach-btn" onClick={(e) => { e.preventDefault(); e.stopPropagation(); fp.open("visibility", "👁️ Visibilité"); }} title="Détacher" type="button">
      <ExternalLink size={12} />
    </button>
  </summary>
  <VisibilityInspectorPanel
    selectedScene={selectedScene}
    selectedToken={sceneTokens.find((t) => t.id === selectedTokenId)}
    sceneTokens={sceneTokens}
  />
</details>
```

Ajouter l'import :
```tsx
import { VisibilityInspectorPanel } from "./components/VisibilityInspectorPanel";
```

Floating panel :
```tsx
{panel.id === "visibility" && (
  <VisibilityInspectorPanel
    selectedScene={selectedScene}
    selectedToken={sceneTokens.find((t) => t.id === selectedTokenId)}
    sceneTokens={sceneTokens}
  />
)}
```

---

### Task 2.3 : Câbler GmNotesPanel

Ajouter dans `gmView === "live"` (après Visibilité) :
```tsx
<details className="gm-panel-section">
  <summary>
    📝 Notes MJ
    <button className="panel-detach-btn" onClick={(e) => { e.preventDefault(); e.stopPropagation(); fp.open("gmnotes", "📝 Notes MJ"); }} title="Détacher" type="button">
      <ExternalLink size={12} />
    </button>
  </summary>
  <GmNotesPanel
    campaignId={selectedCampaign?.id ?? ""}
    selectedScene={selectedScene}
    selectedToken={sceneTokens.find((t) => t.id === selectedTokenId)}
  />
</details>
```

Import + floating panel. Props déjà compatibles avec l'état existant.

---

### Task 2.4 : Câbler InitiativePanel

Ajouter dans `gmView === "live"` :
```tsx
<details className="gm-panel-section">
  <summary>
    ⏱️ Initiative
    <button className="panel-detach-btn" onClick={(e) => { e.preventDefault(); e.stopPropagation(); fp.open("initiative", "⏱️ Initiative"); }} title="Détacher" type="button">
      <ExternalLink size={12} />
    </button>
  </summary>
  <InitiativePanel sceneId={selectedSceneId} sceneTokens={sceneTokens} />
</details>
```

---

### Task 2.5 : Câbler PartySummaryPanel

Ajouter dans `gmView === "characters"` (après le form de création) :
```tsx
<details className="gm-panel-section">
  <summary>📊 Résumé du groupe</summary>
  <PartySummaryPanel characters={characters} selectedCharacter={selectedCharacter} />
</details>
```

---

### Task 2.6 : Câbler AmbiancePanel, ChatPanel, NpcGenerator

**AmbiancePanel** → ajouter dans `gmView === "live"` :
```tsx
<details className="gm-panel-section">
  <summary>
    🎵 Ambiance
    <button className="panel-detach-btn" onClick={(e) => { e.preventDefault(); e.stopPropagation(); fp.open("ambiance", "🎵 Ambiance"); }} title="Détacher" type="button">
      <ExternalLink size={12} />
    </button>
  </summary>
  <AmbiancePanel />
</details>
```

**ChatPanel** → ajouter dans `gmView === "live"` (fusionner avec Communication ? ou séparé) :
```tsx
<details className="gm-panel-section">
  <summary>
    💬 Chat en direct
    <button className="panel-detach-btn" onClick={(e) => { e.preventDefault(); e.stopPropagation(); fp.open("chat", "💬 Chat"); }} title="Détacher" type="button">
      <ExternalLink size={12} />
    </button>
  </summary>
  <ChatPanel campaignId={selectedCampaign?.id ?? ""} wsRef={wsRef} userId={user?.id} displayName={user?.display_name} />
</details>
```

**NpcGenerator** → ajouter dans `gmView === "library"` :
```tsx
<details className="gm-panel-section">
  <summary>
    🧑 PNJ
    <button className="panel-detach-btn" onClick={(e) => { e.preventDefault(); e.stopPropagation(); fp.open("npc", "🧑 Générateur PNJ"); }} title="Détacher" type="button">
      <ExternalLink size={12} />
    </button>
  </summary>
  <NpcGenerator />
</details>
```

Ajouter le rendering floating panel pour chacun.

---

### Task 2.7 : Mettre à jour les imports dans App.tsx

Tous les composants utilisés sans lazy (TokenDetailPanel, VisibilityInspectorPanel, GmNotesPanel, InitiativePanel, PartySummaryPanel) doivent être importés normalement en haut d'App.tsx.

Ceux déjà lazy-loadés (AmbiancePanel, ChatPanel, NpcGenerator) : juste ajouter leur JSX.

---

### Task 2.8 : Mettre à jour baseline + commit

```bash
# Baseline +8 (token-detail, visibility, gmnotes, initiative, party-summary, ambiance, chat, npc)
# Vérifier avec audit-orphans.py
git add -A
git commit -m "feat: wire 8 orphan components into UI panels"
gh pr create --base main --title "Lot 2: Câblage des 8 composants orphelins"
gh pr merge --squash --delete-branch
```

---

## 📦 Lot 3 — Dock de panneaux flottants (menu "+")

**Branche :** `feat/lot-3-floating-panels-dock`

### Objectif
Ajouter un bouton "+" dans la topbar qui ouvre un menu listant tous les panneaux VTT disponibles. Ça permet d'ouvrir n'importe quel panneau comme fenêtre flottante.

### Task 3.1 : Créer le composant Dock

**Créer :** `frontend/src/components/PanelsDock.tsx`

```tsx
import { useState } from "react";
import { Layers, X } from "lucide-react";

type DockPanel = {
  id: string;
  label: string;
  emoji: string;
};

const DOCK_PANELS: DockPanel[] = [
  { id: "combat", label: "Combat", emoji: "⚔️" },
  { id: "encounter", label: "Rencontres", emoji: "🧩" },
  { id: "dice", label: "Dés", emoji: "🎲" },
  { id: "quickactions", label: "Actions rapides", emoji: "⚡" },
  { id: "messages", label: "Messages", emoji: "💬" },
  { id: "chat", label: "Chat", emoji: "💭" },
  { id: "ambiance", label: "Ambiance", emoji: "🎵" },
  { id: "visibility", label: "Visibilité", emoji: "👁️" },
  { id: "gmnotes", label: "Notes MJ", emoji: "📝" },
  { id: "token-detail", label: "Détail token", emoji: "🔍" },
  { id: "initiative", label: "Initiative", emoji: "⏱️" },
  { id: "scene", label: "Scènes", emoji: "🎬" },
  { id: "tokens", label: "Tokens", emoji: "🎭" },
  { id: "sessionlog", label: "Journal", emoji: "📋" },
  { id: "stats", label: "Statistiques", emoji: "📊" },
  { id: "dungeon", label: "Donjons", emoji: "🗺️" },
  { id: "handouts", label: "Documents", emoji: "📄" },
  { id: "bestiary", label: "Bestiaire", emoji: "💀" },
  { id: "spellbook", label: "Grimoire", emoji: "✨" },
  { id: "items", label: "Équipement", emoji: "🎒" },
  { id: "homebrew", label: "Bibliothèque", emoji: "📚" },
  { id: "rules", label: "Règles SRD", emoji: "📖" },
  { id: "npc", label: "Générateur PNJ", emoji: "🧑" },
];

type PanelsDockProps = {
  onOpen: (id: string, title: string) => void;
};

export default function PanelsDock({ onOpen }: PanelsDockProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="panels-dock">
      <button
        className="panels-dock-trigger"
        onClick={() => setOpen(!open)}
        title="Panneaux flottants"
        type="button"
      >
        <Layers size={16} />
      </button>
      {open && (
        <div className="panels-dock-menu">
          <div className="panels-dock-header">
            <span>Panneaux</span>
            <button onClick={() => setOpen(false)} type="button"><X size={14} /></button>
          </div>
          {DOCK_PANELS.map((p) => (
            <button
              key={p.id}
              className="panels-dock-item"
              onClick={() => { onOpen(p.id, `${p.emoji} ${p.label}`); setOpen(false); }}
              type="button"
            >
              <span>{p.emoji}</span> {p.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
```

### Task 3.2 : Ajouter le dock dans la topbar

Dans `App.tsx`, dans la `gm-map-topbar`, ajouter juste après le bouton thème (☀️) :
```tsx
<PanelsDock onOpen={(id, title) => fp.open(id, title)} />
```

### Task 3.3 : Ajouter le CSS

Dans `frontend/src/styles.css` (ou le module shell-gm.css à terme) :
```css
.panels-dock {
  position: relative;
}
.panels-dock-trigger {
  background: none;
  border: 1px solid var(--border-subtle);
  color: var(--text-secondary);
  cursor: pointer;
  padding: 0.25rem 0.5rem;
  border-radius: var(--radius-sm);
}
.panels-dock-trigger:hover {
  background: var(--bg-hover);
}
.panels-dock-menu {
  position: absolute;
  top: 100%;
  right: 0;
  z-index: 2000;
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  padding: 0.5rem;
  min-width: 220px;
  max-height: 60vh;
  overflow-y: auto;
}
.panels-dock-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.25rem 0.5rem;
  margin-bottom: 0.25rem;
  border-bottom: 1px solid var(--border-subtle);
  font-weight: 600;
}
.panels-dock-item {
  display: block;
  width: 100%;
  text-align: left;
  padding: 0.35rem 0.5rem;
  background: none;
  border: none;
  color: var(--text-primary);
  cursor: pointer;
  border-radius: var(--radius-sm);
  font-size: 0.875rem;
}
.panels-dock-item:hover {
  background: var(--bg-hover);
}
```

### Task 3.4 : Commit et PR

```bash
git add -A
git commit -m "feat: add floating panels dock menu with 23 panels"
gh pr create --base main --title "Lot 3: Dock de panneaux flottants"
gh pr merge --squash --delete-branch
```

---

## 📊 Tableau récapitulatif

| # | Lot | Panneaux ajoutés | Branche |
|---|-----|-----------------|---------|
| 1 | Scene + Tokens | ScenePanel, TokenPanel | `feat/lot-1-vtt-scene-panels` |
| 2 | Composants orphelins | TokenDetail, VisibilityInspector, GmNotes, Initiative, PartySummary, Ambiance, Chat, NpcGenerator | `feat/lot-2-wire-orphan-components` |
| 3 | Dock flottant | PanelsDock (menu "+" 23 panneaux) | `feat/lot-3-floating-panels-dock` |

**Total : 10 nouveaux panneaux accessibles + 1 dock universel**

---

## ⚠️ Pièges à éviter

1. **JSX wrapper patch trap** — `patch()` sur du JSX avec `<ErrorBoundary>` peut casser les balises adjacentes. Vérifier avec `grep -n "<main\|</section"` après chaque patch.
2. **React stale closure** — `setToken()` + `loadCampaigns(token)` utilise l'ancien token. Pas concerné ici car on ne touche pas à l'auth.
3. **read_file dédup block** — si `read_file` bloque sur `App.tsx`, utiliser `cat` en terminal.
4. **write_file truncation** — toujours `read_file` complet avant `write_file` sur `App.tsx`.
5. **baseline pre-commit** — ne pas oublier d'incrémenter après chaque lot.
