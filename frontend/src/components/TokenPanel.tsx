import { useState } from "react";
import { apiRequest } from "../api/client";
import type { SceneToken } from "../api/types";

type TokenPanelProps = {
  campaignId: string;
  token: string;
  sceneId: string;
  tokens: SceneToken[];
  onTokensChanged: () => void;
};

const DEFAULT_COLOR = "#7c3aed";

export function TokenPanel({
  campaignId,
  token,
  sceneId,
  tokens,
  onTokensChanged,
}: TokenPanelProps) {
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
        <header className="gm-panel-section-header">
          <strong>Tokens</strong>
        </header>
        <div className="empty-hint">Sélectionnez une scène pour gérer ses tokens.</div>
      </div>
    );
  }

  async function createToken() {
    if (!name.trim()) return;
    setSaving(true);
    setError("");
    try {
      await apiRequest(`/api/scenes/${sceneId}/tokens`, token, {
        method: "POST",
        body: JSON.stringify({ name: name.trim(), x, y, size, color }),
      });
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
      await apiRequest(`/api/tokens/${tokenId}`, token, { method: "DELETE" });
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
          background: var(--bg-surface);
          border: 1px solid var(--border-color, var(--border-subtle));
          font-size: 13px;
        }
        .gm-token-panel .token-swatch {
          width: 16px; height: 16px; border-radius: 3px; flex-shrink: 0;
          border: 1px solid var(--border-color, var(--border-subtle));
        }
        .gm-token-panel .token-name { flex: 1; font-weight: 500; color: var(--text-strong); }
        .gm-token-panel .token-pos { font-size: 11px; color: var(--text-muted); }
        .gm-token-panel .token-del {
          cursor: pointer; color: var(--text-muted); font-size: 16px;
          padding: 2px 6px; border-radius: 3px; border: none; background: none;
        }
        .gm-token-panel .token-del:hover { color: var(--danger); background: var(--bg-hover); }
        .gm-token-panel .create-form { padding: 10px; background: var(--bg-surface); border-radius: 6px; }
        .gm-token-panel .create-form input {
          width: 100%; margin-bottom: 6px; padding: 6px 8px;
          background: var(--bg-surface-elevated); color: var(--text-strong);
          border: 1px solid var(--border-color, var(--border-subtle)); border-radius: 4px;
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
        .gm-token-panel .btn-primary { background: var(--accent-secondary); color: var(--text-inverse); }
        .gm-token-panel .btn-secondary { background: var(--border-color, var(--border-subtle)); color: var(--text-strong); }
        .gm-token-panel .btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .gm-token-panel .error-msg { color: var(--danger); font-size: 12px; margin-bottom: 6px; }
        .gm-token-panel .empty-hint {
          text-align: center; color: var(--text-muted);
          font-size: 13px; padding: 24px;
        }
        .gm-token-panel .hidden-badge {
          font-size: 10px; padding: 1px 4px; border-radius: 2px;
          background: var(--border-color, var(--border-subtle)); color: var(--text-muted);
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
            <input
              type="number"
              placeholder="X"
              value={x}
              min={0}
              max={10000}
              onChange={(e) => setX(Number(e.target.value))}
              style={{ width: 80 }}
            />
            <input
              type="number"
              placeholder="Y"
              value={y}
              min={0}
              max={10000}
              onChange={(e) => setY(Number(e.target.value))}
              style={{ width: 80 }}
            />
            <input
              type="number"
              placeholder="Taille"
              value={size}
              min={1}
              max={8}
              onChange={(e) => setSize(Number(e.target.value))}
              style={{ width: 80 }}
            />
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              title="Couleur"
            />
          </div>
          <div className="btn-row">
            <button
              className="btn btn-primary"
              onClick={createToken}
              disabled={saving || !name.trim()}
            >
              {saving ? "Création..." : "Ajouter"}
            </button>
            <button className="btn btn-secondary" onClick={() => setShowCreate(false)}>
              Annuler
            </button>
          </div>
        </div>
      )}

      <div className="token-list" style={{ marginTop: showCreate ? 10 : 0 }}>
        {tokens.length === 0 && <div className="empty-hint">Aucun token dans cette scène.</div>}
        {tokens.map((t) => (
          <div key={t.id} className="token-row">
            <span className="token-swatch" style={{ backgroundColor: t.color }} />
            <span className="token-name">{t.name}</span>
            {t.is_hidden && <span className="hidden-badge">caché</span>}
            <span className="token-pos">
              ({t.x}, {t.y}) ×{t.size}
            </span>
            <button className="token-del" onClick={() => deleteToken(t.id)} title="Supprimer">
              ×
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
