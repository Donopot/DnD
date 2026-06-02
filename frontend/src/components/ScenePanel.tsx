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
