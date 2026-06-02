# Plan : Panneaux Scene + Token + Nettoyage code mort

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Supprimer 2 fichiers morts (`i18n/index.ts`, `InlineSpinner.tsx`), développer les 2 panneaux `planned` (`scene` et `tokens`) en composants React fonctionnels.

**Architecture:** 2 nouveaux composants frontend — `ScenePanel` (CRUD scenes, activation) et `TokenPanel` (CRUD tokens pour la scène active). Backend existant : `vtt.py` fournit déjà tous les endpoints nécessaires.

**Tech Stack:** React 18 + TypeScript, `fetch()` + `authHeaders()`, CSS inline via `<style>`, lazy-loading.

**Conventions:** See `dnd-vtt-conventions.md` — lazy import pattern, API calling pattern, component registration, orphan baseline update.

---

## Audit de l'existant

### ✅ Backend — déjà codé

| Endpoint | Méthode | Rôle |
|----------|---------|------|
| `/api/campaigns/{id}/scenes` | GET | Liste les scènes (GM + player) |
| `/api/campaigns/{id}/scenes` | POST | Crée une scène (GM/co-GM) |
| `/api/scenes/{id}` | GET | Détail d'une scène |
| `/api/scenes/{id}/settings` | PATCH | Modifie grid/zoom/pan (GM) |
| `/api/scenes/{id}/tokens` | GET | Liste les tokens (GM → full, player → filtré) |
| `/api/scenes/{id}/tokens` | POST | Crée un token (GM/player) |
| `/api/tokens/{id}` | PATCH | Modifie un token (position, couleur, etc.) |
| `/api/tokens/{id}/move` | PATCH | Déplace un token (léger) |
| `/api/tokens/{id}` | DELETE | Supprime un token (GM) |

### ✅ Types déjà disponibles

- `Scene` : `id, campaign_id, name, description, grid_size, width, height, background_url, background_asset_id, is_active, snap_to_grid, view_zoom, view_pan_x, view_pan_y, created_at, updated_at`
- `SceneToken` : `id, scene_id, character_id, name, x, y, size, color, is_hidden, metadata, created_at, updated_at`

### ✅ App.tsx — props disponibles

- `selectedCampaign?.id` → `campaignId` (string)
- `scenes` → `Scene[]` (via `loadVttState`)
- `selectedScene` → computed from `scenes` + `selectedSceneId`
- `token` → token d'auth (stocké dans `useState`)
- `setSelectedSceneId` → pour changer la scène active

### ❌ Frontend — ce qui manque

| Besoin | Action |
|--------|--------|
| Panneau liste/création de scènes | Créer `ScenePanel.tsx` |
| Panneau liste/création de tokens | Créer `TokenPanel.tsx` (par scène) |
| Lazy import dans App.tsx | Ajouter 2 `lazy()` |
| Rendu dans la sidebar | Ajouter `<ScenePanel>` et `<TokenPanel>` |
| Statut registre (planned→active) | Modifier `gmPanels.ts` |
| Mode sets | Ajouter les IDs dans `sessionLiveModes.ts` |
| Script de vérification | Mettre à jour `check-gm-panels-current.sh` |

### 🗑️ Code mort

| Fichier | Réfs | Action |
|---------|------|--------|
| `i18n/index.ts` | 0 | Supprimer |
| `components/InlineSpinner.tsx` | 0 | Supprimer |

---

## Tâches

### Task 1: Supprimer les 2 fichiers morts

**Objective:** Nettoyer `i18n/index.ts` et `InlineSpinner.tsx` (0 référence chacun).

**Files:**
- Remove: `frontend/src/i18n/index.ts`
- Remove: `frontend/src/components/InlineSpinner.tsx`
- Remove (si vide): `frontend/src/i18n/` directory

**Step 1: Supprimer les fichiers**

```bash
rm frontend/src/i18n/index.ts
rm frontend/src/components/InlineSpinner.tsx
# Si i18n/ est vide après suppression
rmdir frontend/src/i18n 2>/dev/null || true
# Si fr.json existe encore, le garder ou le supprimer
ls frontend/src/i18n/ 2>/dev/null && echo "NON-VIDE" || rmdir frontend/src/i18n 2>/dev/null
```

**Step 2: Vérifier tsc + build**

```bash
cd frontend && npx tsc --noEmit && npm run build
```
Expected: 0 erreur, build OK.

**Step 3: Commit**

```bash
git add frontend/src/i18n/ frontend/src/components/InlineSpinner.tsx
git commit -m "chore: remove dead files (i18n/index.ts, InlineSpinner.tsx)"
```

---

### Task 2: Créer ScenePanel.tsx

**Objective:** Panneau de gestion des scènes — liste, création, activation.

**Files:**
- Create: `frontend/src/components/ScenePanel.tsx`

**Props:**
```ts
type ScenePanelProps = {
  campaignId: string;
  token: string;            // auth token pour les appels API
  scenes: Scene[];          // liste actuelle (depuis App.tsx)
  onSelectScene: (sceneId: string) => void;  // callback pour changer de scène
  onScenesChanged: () => void;  // callback pour recharger après CRUD
};
```

**Fonctionnalités:**
1. Afficher la liste des scènes avec nom, description, statut actif (badge)
2. Bouton "Nouvelle scène" → formulaire inline (nom, description, grid_size, width, height)
3. Création via `POST /api/campaigns/{id}/scenes`
4. Click sur une scène → `onSelectScene(scene.id)`
5. La scène active a un highlight visuel (classe CSS `scene-active`)

**Code complet:**

```tsx
import { useState } from "react";
import { authHeaders } from "../api/client";
import type { Scene } from "../api/types";

type ScenePanelProps = {
  campaignId: string;
  token: string;
  scenes: Scene[];
  onSelectScene: (sceneId: string) => void;
  onScenesChanged: () => void;
};

export function ScenePanel({ campaignId, token, scenes, onSelectScene, onScenesChanged }: ScenePanelProps) {
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [gridSize, setGridSize] = useState(50);
  const [width, setWidth] = useState(1600);
  const [height, setHeight] = useState(1000);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function createScene() {
    if (!name.trim()) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/campaigns/${campaignId}/scenes`, {
        method: "POST",
        headers: { ...authHeaders(token), "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim(),
          grid_size: gridSize,
          width,
          height,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.detail ?? "Erreur création scène");
      }
      setName("");
      setDescription("");
      setShowCreate(false);
      onScenesChanged();
    } catch (err: any) {
      setError(err.message ?? "Erreur inconnue");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="gm-panel-content gm-scene-panel">
      <style>{`
        .gm-scene-panel .scene-list { display: flex; flex-direction: column; gap: 6px; }
        .gm-scene-panel .scene-card {
          padding: 10px 12px; border-radius: 6px;
          background: var(--panel-bg, #1a2a1e); cursor: pointer;
          border: 1px solid var(--border-color, #2a3a2e);
          transition: border-color 0.15s;
        }
        .gm-scene-panel .scene-card:hover { border-color: var(--brand-green, #1f5f43); }
        .gm-scene-panel .scene-card.scene-active {
          border-color: var(--brand-green, #1f5f43);
          background: var(--panel-hover, #223322);
        }
        .gm-scene-panel .scene-name { font-weight: 600; font-size: 14px; color: var(--text-primary, #d4d4c8); }
        .gm-scene-panel .scene-desc { font-size: 12px; color: var(--text-muted, #6a7a6e); margin-top: 2px; }
        .gm-scene-panel .scene-meta { font-size: 11px; color: var(--text-muted, #6a7a6e); margin-top: 4px; }
        .gm-scene-panel .active-badge {
          display: inline-block; font-size: 10px; padding: 1px 6px;
          border-radius: 3px; background: var(--brand-green, #1f5f43);
          color: #fff; margin-left: 6px;
        }
        .gm-scene-panel .create-form { padding: 10px; background: var(--panel-bg, #1a2a1e); border-radius: 6px; }
        .gm-scene-panel .create-form input, .gm-scene-panel .create-form textarea {
          width: 100%; margin-bottom: 6px; padding: 6px 8px;
          background: var(--input-bg, #0d1a10); color: var(--text-primary, #d4d4c8);
          border: 1px solid var(--border-color, #2a3a2e); border-radius: 4px;
          font-size: 13px;
        }
        .gm-scene-panel .create-form textarea { min-height: 60px; resize: vertical; }
        .gm-scene-panel .btn-row { display: flex; gap: 6px; }
        .gm-scene-panel .btn {
          padding: 6px 12px; border: none; border-radius: 4px;
          font-size: 12px; cursor: pointer;
        }
        .gm-scene-panel .btn-primary { background: var(--brand-green, #1f5f43); color: #fff; }
        .gm-scene-panel .btn-secondary { background: var(--border-color, #2a3a2e); color: var(--text-primary, #d4d4c8); }
        .gm-scene-panel .btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .gm-scene-panel .error-msg { color: #e05555; font-size: 12px; margin-top: 4px; }
        .gm-scene-panel .grid-row { display: flex; gap: 6px; }
        .gm-scene-panel .grid-row label { font-size: 11px; color: var(--text-muted, #6a7a6e); }
        .gm-scene-panel .grid-row input { width: 70px; }
      `}</style>

      <header className="gm-panel-section-header">
        <strong>Scènes</strong>
        <button className="btn btn-primary" onClick={() => setShowCreate(!showCreate)}>
          {showCreate ? "✕ Annuler" : "+ Nouvelle"}
        </button>
      </header>

      {error && <div className="error-msg">{error}</div>}

      {showCreate && (
        <div className="create-form">
          <input
            placeholder="Nom de la scène"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={120}
          />
          <textarea
            placeholder="Description (optionnelle)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={2000}
          />
          <div className="grid-row">
            <label>Grille <input type="number" value={gridSize} min={16} max={200} onChange={(e) => setGridSize(Number(e.target.value))} /></label>
            <label>Largeur <input type="number" value={width} min={200} max={10000} onChange={(e) => setWidth(Number(e.target.value))} /></label>
            <label>Hauteur <input type="number" value={height} min={200} max={10000} onChange={(e) => setHeight(Number(e.target.value))} /></label>
          </div>
          <div className="btn-row" style={{ marginTop: 8 }}>
            <button className="btn btn-primary" onClick={createScene} disabled={saving || !name.trim()}>
              {saving ? "Création..." : "Créer la scène"}
            </button>
            <button className="btn btn-secondary" onClick={() => setShowCreate(false)}>
              Annuler
            </button>
          </div>
        </div>
      )}

      <div className="scene-list" style={{ marginTop: showCreate ? 10 : 0 }}>
        {scenes.length === 0 && (
          <div style={{ color: "var(--text-muted, #6a7a6e)", fontSize: 13, padding: 12, textAlign: "center" }}>
            Aucune scène. Créez-en une !
          </div>
        )}
        {scenes.map((scene) => (
          <div
            key={scene.id}
            className={`scene-card ${scene.is_active ? "scene-active" : ""}`}
            onClick={() => onSelectScene(scene.id)}
          >
            <div className="scene-name">
              {scene.name}
              {scene.is_active && <span className="active-badge">active</span>}
            </div>
            {scene.description && <div className="scene-desc">{scene.description.slice(0, 80)}{scene.description.length > 80 ? "…" : ""}</div>}
            <div className="scene-meta">
              {scene.width}×{scene.height} — grille {scene.grid_size}px
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

**Step 1: Écrire le fichier**

Créer `frontend/src/components/ScenePanel.tsx` avec le code ci-dessus.

**Step 2: Vérifier tsc**

```bash
cd frontend && npx tsc --noEmit
```
Expected: 0 erreur.

**Step 3: Commit**

```bash
git add frontend/src/components/ScenePanel.tsx
git commit -m "feat(panels): add ScenePanel — scene list + create"
```

---

### Task 3: Créer TokenPanel.tsx

**Objective:** Panneau de gestion des tokens pour la scène active — liste, création, édition rapide.

**Files:**
- Create: `frontend/src/components/TokenPanel.tsx`

**Props:**
```ts
type TokenPanelProps = {
  campaignId: string;
  token: string;
  sceneId: string;          // scène active
  tokens: SceneToken[];     // liste depuis App.tsx
  onTokensChanged: () => void;
};
```

**Fonctionnalités:**
1. Afficher la liste des tokens (nom, position, taille, couleur)
2. Formulaire d'ajout rapide : nom, x, y, size, color
3. Création via `POST /api/scenes/{id}/tokens`
4. Suppression via `DELETE /api/tokens/{id}` (icône ×)
5. Si `sceneId` est vide, afficher un message "Sélectionnez une scène"

**Code complet:**

```tsx
import { useState } from "react";
import { authHeaders } from "../api/client";
import type { SceneToken } from "../api/types";

type TokenPanelProps = {
  campaignId: string;
  token: string;
  sceneId: string;
  tokens: SceneToken[];
  onTokensChanged: () => void;
};

const DEFAULT_COLOR = "#7c3aed";

export function TokenPanel({ campaignId, token, sceneId, tokens, onTokensChanged }: TokenPanelProps) {
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [x, setX] = useState(0);
  const [y, setY] = useState(0);
  const [size, setSize] = useState(1);
  const [color, setColor] = useState(DEFAULT_COLOR);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  if (!sceneId) {
    return (
      <div className="gm-panel-content gm-token-panel">
        <header className="gm-panel-section-header"><strong>Tokens</strong></header>
        <div className="empty-hint">Sélectionnez une scène pour gérer ses tokens.</div>
      </div>
    );
  }

  async function createToken() {
    if (!name.trim()) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/scenes/${sceneId}/tokens`, {
        method: "POST",
        headers: { ...authHeaders(token), "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), x, y, size, color }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.detail ?? "Erreur création token");
      }
      setName("");
      setX(0);
      setY(0);
      setSize(1);
      setColor(DEFAULT_COLOR);
      setShowCreate(false);
      onTokensChanged();
    } catch (err: any) {
      setError(err.message ?? "Erreur inconnue");
    } finally {
      setSaving(false);
    }
  }

  async function deleteToken(tokenId: string) {
    try {
      const res = await fetch(`/api/tokens/${tokenId}`, {
        method: "DELETE",
        headers: authHeaders(token),
      });
      if (!res.ok) throw new Error("Erreur suppression");
      onTokensChanged();
    } catch (err: any) {
      setError(err.message ?? "Erreur suppression");
    }
  }

  return (
    <div className="gm-panel-content gm-token-panel">
      <style>{`
        .gm-token-panel .token-list { display: flex; flex-direction: column; gap: 4px; }
        .gm-token-panel .token-row {
          display: flex; align-items: center; gap: 8px;
          padding: 8px 10px; border-radius: 4px;
          background: var(--panel-bg, #1a2a1e);
          border: 1px solid var(--border-color, #2a3a2e);
          font-size: 13px;
        }
        .gm-token-panel .token-swatch {
          width: 16px; height: 16px; border-radius: 3px; flex-shrink: 0;
          border: 1px solid var(--border-color, #2a3a2e);
        }
        .gm-token-panel .token-name { flex: 1; font-weight: 500; color: var(--text-primary, #d4d4c8); }
        .gm-token-panel .token-pos { font-size: 11px; color: var(--text-muted, #6a7a6e); }
        .gm-token-panel .token-del {
          cursor: pointer; color: var(--text-muted, #6a7a6e); font-size: 16px;
          padding: 2px 6px; border-radius: 3px; border: none; background: none;
        }
        .gm-token-panel .token-del:hover { color: #e05555; background: var(--panel-hover, #223322); }
        .gm-token-panel .create-form { padding: 10px; background: var(--panel-bg, #1a2a1e); border-radius: 6px; }
        .gm-token-panel .create-form input {
          width: 100%; margin-bottom: 6px; padding: 6px 8px;
          background: var(--input-bg, #0d1a10); color: var(--text-primary, #d4d4c8);
          border: 1px solid var(--border-color, #2a3a2e); border-radius: 4px;
          font-size: 13px;
        }
        .gm-token-panel .create-form input[type="color"] {
          width: 40px; height: 30px; padding: 2px;
        }
        .gm-token-panel .btn-row { display: flex; gap: 6px; }
        .gm-token-panel .btn {
          padding: 6px 12px; border: none; border-radius: 4px;
          font-size: 12px; cursor: pointer;
        }
        .gm-token-panel .btn-primary { background: var(--brand-green, #1f5f43); color: #fff; }
        .gm-token-panel .btn-secondary { background: var(--border-color, #2a3a2e); color: var(--text-primary, #d4d4c8); }
        .gm-token-panel .btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .gm-token-panel .error-msg { color: #e05555; font-size: 12px; margin-bottom: 6px; }
        .gm-token-panel .empty-hint {
          text-align: center; color: var(--text-muted, #6a7a6e);
          font-size: 13px; padding: 24px;
        }
        .gm-token-panel .hidden-badge {
          font-size: 10px; padding: 1px 4px; border-radius: 2px;
          background: var(--border-color, #2a3a2e); color: var(--text-muted, #6a7a6e);
        }
      `}</style>

      <header className="gm-panel-section-header">
        <strong>Tokens</strong>
        <button className="btn btn-primary" onClick={() => setShowCreate(!showCreate)}>
          {showCreate ? "✕ Annuler" : "+ Token"}
        </button>
      </header>

      {error && <div className="error-msg">{error}</div>}

      {showCreate && (
        <div className="create-form">
          <input
            placeholder="Nom du token"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={120}
          />
          <div style={{ display: "flex", gap: 6, marginBottom: 6 }}>
            <input type="number" placeholder="X" value={x} min={0} max={10000} onChange={(e) => setX(Number(e.target.value))} style={{ width: 80 }} />
            <input type="number" placeholder="Y" value={y} min={0} max={10000} onChange={(e) => setY(Number(e.target.value))} style={{ width: 80 }} />
            <input type="number" placeholder="Taille" value={size} min={1} max={8} onChange={(e) => setSize(Number(e.target.value))} style={{ width: 80 }} />
            <input type="color" value={color} onChange={(e) => setColor(e.target.value)} title="Couleur" />
          </div>
          <div className="btn-row">
            <button className="btn btn-primary" onClick={createToken} disabled={saving || !name.trim()}>
              {saving ? "Création..." : "Ajouter"}
            </button>
            <button className="btn btn-secondary" onClick={() => setShowCreate(false)}>Annuler</button>
          </div>
        </div>
      )}

      <div className="token-list" style={{ marginTop: showCreate ? 10 : 0 }}>
        {tokens.length === 0 && (
          <div className="empty-hint">Aucun token dans cette scène.</div>
        )}
        {tokens.map((t) => (
          <div key={t.id} className="token-row">
            <span className="token-swatch" style={{ backgroundColor: t.color }} />
            <span className="token-name">{t.name}</span>
            {t.is_hidden && <span className="hidden-badge">caché</span>}
            <span className="token-pos">({t.x}, {t.y}) ×{t.size}</span>
            <button className="token-del" onClick={() => deleteToken(t.id)} title="Supprimer">×</button>
          </div>
        ))}
      </div>
    </div>
  );
}
```

**Step 1: Écrire le fichier**

Créer `frontend/src/components/TokenPanel.tsx` avec le code ci-dessus.

**Step 2: Vérifier tsc**

```bash
cd frontend && npx tsc --noEmit
```
Expected: 0 erreur.

**Step 3: Commit**

```bash
git add frontend/src/components/TokenPanel.tsx
git commit -m "feat(panels): add TokenPanel — token list + create/delete per scene"
```

---

### Task 4: Enregistrer les composants dans App.tsx

**Objective:** Ajouter les `lazy()` imports et le rendu conditionnel dans la sidebar.

**Files:**
- Modify: `frontend/src/App.tsx`

**Step 1: Ajouter les lazy imports** (après la ligne du `NpcGenerator`, vers ~79)

```tsx
const ScenePanel = lazy(() =>
  import("./components/ScenePanel").then((m) => ({ default: m.ScenePanel })),
);
const TokenPanel = lazy(() =>
  import("./components/TokenPanel").then((m) => ({ default: m.TokenPanel })),
);
```

**Step 2: Ajouter l'état `sceneTokens` et la fonction de chargement dans App.tsx**

Chercher `loadVttState` et ajouter un état `sceneTokens` :

```tsx
const [sceneTokens, setSceneTokens] = useState<SceneToken[]>([]);
```

Ajouter une fonction `loadSceneTokens` :

```tsx
async function loadSceneTokens(sceneId: string) {
  if (!sceneId || !token) {
    setSceneTokens([]);
    return;
  }
  try {
    const data = await request<SceneToken[]>(`/api/scenes/${sceneId}/tokens`);
    setSceneTokens(data);
  } catch {
    setSceneTokens([]);
  }
}
```

Ajouter un `useEffect` pour charger les tokens quand la scène change :

```tsx
useEffect(() => {
  if (selectedScene?.id) {
    void loadSceneTokens(selectedScene.id);
  } else {
    setSceneTokens([]);
  }
}, [selectedScene?.id, token]);
```

**Step 3: Repérer l'emplacement dans la sidebar** — chercher la section "Préparation" (onglet Préparation) où `scene` et `tokens` sont déclarés dans `gmPanels.ts` (category: "preparation").

Ajouter le rendu avec `liveModePanelIds` wrapper :

```tsx
{liveModePanelIds.has("scene") && (
  <Suspense fallback={<div className="panel-loading">Chargement…</div>}>
    <ScenePanel
      campaignId={selectedCampaign?.id ?? ""}
      token={token}
      scenes={scenes}
      onSelectScene={(id) => setSelectedSceneId(id)}
      onScenesChanged={() => {
        if (selectedCampaign?.id) {
          void loadVttState(selectedCampaign.id);
        }
      }}
    />
  </Suspense>
)}
```

Même chose pour `tokens` :

```tsx
{liveModePanelIds.has("tokens") && (
  <Suspense fallback={<div className="panel-loading">Chargement…</div>}>
    <TokenPanel
      campaignId={selectedCampaign?.id ?? ""}
      token={token}
      sceneId={selectedScene?.id ?? ""}
      tokens={sceneTokens}
      onTokensChanged={() => {
        if (selectedScene?.id) {
          void loadSceneTokens(selectedScene.id);
        }
      }}
    />
  </Suspense>
)}
```

**Step 4: Importer le type `SceneToken`** si pas déjà fait :

Vérifier que `import type { ..., SceneToken } from "./api/types";` existe. Ajouter si nécessaire.

**Step 5: Vérifier tsc + build**

```bash
cd frontend && npx tsc --noEmit && npm run build
```
Expected: 0 erreur, build OK.

**Step 6: Commit**

```bash
git add frontend/src/App.tsx
git commit -m "feat(panels): wire ScenePanel + TokenPanel into sidebar"
```

---

### Task 5: Mettre à jour le registre et les mode sets

**Objective:** Passer `scene` et `tokens` de `planned` à `active`, ajouter dans `SESSION_LIVE_PANEL_SETS`.

**Files:**
- Modify: `frontend/src/config/gmPanels.ts`
- Modify: `frontend/src/config/sessionLiveModes.ts`

**Step 1: gmPanels.ts** — changer le statut :

Chercher les entrées `scene` et `tokens` (lignes ~170-185), remplacer `status: "planned"` par `status: "active"`.

**Step 2: sessionLiveModes.ts** — ajouter `"scene"` et `"tokens"` dans chaque mode set.

**Step 3: Vérifier tsc + build**

```bash
cd frontend && npx tsc --noEmit && npm run build
```
Expected: 0 erreur, build OK.

**Step 4: Commit**

```bash
git add frontend/src/config/gmPanels.ts frontend/src/config/sessionLiveModes.ts
git commit -m "feat(panels): promote scene+tokens to active, add to mode sets"
```

---

### Task 6: Mise à jour du script de vérification et finalisation

**Objective:** Mettre à jour `check-gm-panels-current.sh` et valider le tout.

**Files:**
- Modify: `scripts/check-gm-panels-current.sh`

**Step 1: Mettre à jour `sidebar_only_ids`** — retirer `scene` et `tokens` de la liste si présents (puisqu'ils ont maintenant un composant).

**Step 2: Vérifier le registre** — `scene` et `tokens` doivent apparaître comme `active`.

**Step 3: Lancer le check complet**

```bash
bash scripts/check-gm-panels-current.sh
```
Expected: 6/6 ✓.

**Step 4: Build + tsc final**

```bash
cd frontend && npx tsc --noEmit && npm run build
```
Expected: 0 erreur, build OK.

**Step 5: Commit**

```bash
git add scripts/check-gm-panels-current.sh
git commit -m "chore(panels): update check script for ScenePanel+TokenPanel"
```

---

## Vérification finale

```bash
cd /opt/data/workspace/DnD
bash scripts/check-gm-panels-current.sh  # 6/6
cd frontend && npx tsc --noEmit           # 0 erreur
npm run build                              # OK
cd ../backend && pytest --tb=short -q      # 80/80
```

## Résumé des changements

| Action | Fichier |
|--------|---------|
| 🗑️ Supprimer | `i18n/index.ts`, `components/InlineSpinner.tsx` |
| ✨ Créer | `components/ScenePanel.tsx` (130 lignes) |
| ✨ Créer | `components/TokenPanel.tsx` (150 lignes) |
| 🔧 Modifier | `App.tsx` (lazy imports + rendering + state) |
| 🔧 Modifier | `gmPanels.ts` (statuts planned→active) |
| 🔧 Modifier | `sessionLiveModes.ts` (+2 IDs par mode) |
| 🔧 Modifier | `check-gm-panels-current.sh` |
