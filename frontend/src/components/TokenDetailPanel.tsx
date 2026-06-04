import { ArrowDownToLine, ArrowUpToLine, Eye, EyeOff, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";

import type { Character, Scene, SceneToken } from "../api/types";
import { useWorkspaceState } from "../contexts/WorkspaceStateContext";
import { useWorkspaceActions } from "../contexts/WorkspaceActionsContext";
import { useVttContext } from "../contexts/VttContext";

type TokenPosition = {
  x: number;
  y: number;
};

/** @deprecated Props kept for backward compatibility until all callers use contexts. */
type TokenDetailPanelProps = {
  selectedScene?: Scene | undefined;
  selectedToken?: SceneToken | undefined;
  selectedTokenCharacter?: Character | undefined;
  selectedTokenPosition?: TokenPosition | undefined;
  token?: string;
  onCenterSelectedToken?: () => void;
  onDeselectToken?: () => void;
  onNudgeSelectedToken?: (dx: number, dy: number) => void;
  onTokenUpdated?: (updated: SceneToken) => void;
};

const HOSTILITY_OPTIONS = [
  { value: "hostile", label: "Hostile", color: "#ef4444" },
  { value: "neutral", label: "Neutre", color: "#f59e0b" },
  { value: "ally", label: "Allié", color: "#22c55e" },
] as const;

export function TokenDetailPanel(props: TokenDetailPanelProps = {}) {
  // Contexts — primary source of truth
  const state = useWorkspaceState();
  const actions = useWorkspaceActions();
  const vtt = useVttContext();

  // Compute derived values from contexts (with prop fallback)
  const authToken = props.token ?? state.token;
  const selectedTokenId = vtt.selectedTokenId;
  const selectedToken =
    props.selectedToken ?? state.sceneTokens.find((t) => t.id === selectedTokenId);
  const selectedScene = props.selectedScene ?? state.selectedScene;
  const selectedTokenCharacter = props.selectedTokenCharacter ?? (
    selectedToken?.character_id
      ? state.characters.find((c) => c.id === selectedToken.character_id)
      : undefined
  );
  const selectedTokenPosition = props.selectedTokenPosition ?? (
    selectedToken ? { x: selectedToken.x, y: selectedToken.y } : undefined
  );
  const onDeselectToken = props.onDeselectToken ?? (() => vtt.setSelectedTokenId(""));
  const onNudgeSelectedToken = props.onNudgeSelectedToken ?? ((dx: number, dy: number) => {
    if (selectedToken) void actions.handleMoveToken(selectedToken, dx, dy);
  });
  const onTokenUpdated = props.onTokenUpdated;

  const step = selectedScene?.grid_size ?? 50;

  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [busy, setBusy] = useState(false);

  const headers = useMemo(
    () => ({
      "Content-Type": "application/json",
      Authorization: `Bearer ${authToken}`,
    }),
    [authToken],
  );

  async function updateField(field: string, value: unknown) {
    if (!selectedToken) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/scene-tokens/${selectedToken.id}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({ [field]: value }),
      });
      if (res.ok) {
        const updated = await res.json() as SceneToken;
        onTokenUpdated?.(updated);
      }
    } catch {
      // silent
    } finally {
      setBusy(false);
      setEditingField(null);
    }
  }

  function startEdit(field: string, currentValue: unknown) {
    setEditingField(field);
    setEditValue(String(currentValue ?? ""));
  }

  if (!selectedToken) {
    return (
      <div className="gm-panel-content token-detail-panel" data-vtt-panel>
        <p className="gm-panel-muted">Sélectionnez un token sur la carte.</p>
      </div>
    );
  }

  return (
    <div className="gm-panel-content token-detail-panel" data-vtt-panel>
      {/* ── Header ──────────────────────────────────────────────── */}
      <section className="gm-panel-section">
        <header className="gm-panel-section-header">
          <strong>🔍 {selectedToken.name || "Token"}</strong>
          <small>
            {selectedTokenCharacter?.name ?? "Sans personnage"}
          </small>
        </header>

        <div className="gm-panel-actions">
          <button onClick={onDeselectToken} type="button">
            Désélectionner
          </button>
        </div>
      </section>

      {/* ── Properties ───────────────────────────────────────────── */}
      <section className="gm-panel-section">
        <header className="gm-panel-section-header">
          <strong>Propriétés</strong>
        </header>

        <div className="gm-panel-list">
          {/* Label */}
          <div className="gm-panel-row">
            <span>Label</span>
            {editingField === "label" ? (
              <input
                autoFocus
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onBlur={() => updateField("label", editValue)}
                onKeyDown={(e) => e.key === "Enter" && updateField("label", editValue)}
                className="token-detail-edit-input"
              />
            ) : (
              <span
                className="token-detail-editable"
                onClick={() => startEdit("label", selectedToken.name)}
              >
                {selectedToken.name || "(aucun)"}
              </span>
            )}
          </div>

          {/* Size */}
          <div className="gm-panel-row">
            <span>Taille</span>
            {editingField === "size" ? (
              <select
                autoFocus
                value={editValue}
                onChange={(e) => {
                  setEditValue(e.target.value);
                  updateField("size", e.target.value);
                }}
                onBlur={() => setEditingField(null)}
              >
                <option value="tiny">TP</option>
                <option value="small">P</option>
                <option value="medium">M</option>
                <option value="large">G</option>
                <option value="huge">TG</option>
                <option value="gargantuan">Gig</option>
              </select>
            ) : (
              <span
                className="token-detail-editable"
                onClick={() => startEdit("size", selectedToken.size ?? "medium")}
              >
                {selectedToken.size ?? "medium"}
              </span>
            )}
          </div>

          {/* Hostility */}
          <div className="gm-panel-row">
            <span>Hostilité</span>
            <span style={{ display: "flex", gap: 4 }}>
              {HOSTILITY_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  className={`token-detail-toggle ${(selectedToken.metadata?.hostility as string) === opt.value ? "active" : ""}`}
                  style={{
                    borderColor: (selectedToken.metadata?.hostility as string) === opt.value ? opt.color : undefined,
                    color: (selectedToken.metadata?.hostility as string) === opt.value ? opt.color : undefined,
                  }}
                  onClick={() => updateField("hostility", opt.value)}
                  type="button"
                  disabled={busy}
                >
                  {opt.label}
                </button>
              ))}
            </span>
          </div>

          {/* Hidden */}
          <div className="gm-panel-row">
            <span>Visibilité</span>
            <button
              className={`token-detail-toggle ${selectedToken.is_hidden ? "hidden" : ""}`}
              onClick={() => {
                void actions.handleToggleTokenHidden(selectedToken).then(() => {
                  if (onTokenUpdated) {
                    onTokenUpdated({ ...selectedToken, is_hidden: !selectedToken.is_hidden });
                  }
                });
              }}
              type="button"
              disabled={busy}
            >
              {selectedToken.is_hidden ? <EyeOff size={12} /> : <Eye size={12} />}
              {selectedToken.is_hidden ? "Caché" : "Visible"}
            </button>
          </div>
        </div>
      </section>

      {/* ── Nudge ──────────────────────────────────────────────────── */}
      <section className="gm-panel-section">
        <header className="gm-panel-section-header">
          <strong>Position</strong>
          {selectedTokenPosition && (
            <small>
              ({selectedTokenPosition.x}, {selectedTokenPosition.y})
            </small>
          )}
        </header>

        <div className="token-detail-nudge-grid">
          <button
            onClick={() => onNudgeSelectedToken(0, -step)}
            type="button"
            title="Haut"
          >
            <ArrowUpToLine size={14} />
          </button>
          <button
            onClick={() => onNudgeSelectedToken(-step, 0)}
            type="button"
            title="Gauche"
          >
            ←
          </button>
          <button
            onClick={() => onNudgeSelectedToken(step, 0)}
            type="button"
            title="Droite"
          >
            →
          </button>
          <button
            onClick={() => onNudgeSelectedToken(0, step)}
            type="button"
            title="Bas"
          >
            <ArrowDownToLine size={14} />
          </button>
        </div>
      </section>

      {/* ── Character link ─────────────────────────────────────────── */}
      {selectedTokenCharacter && (
        <section className="gm-panel-section">
          <header className="gm-panel-section-header">
            <strong>Personnage lié</strong>
          </header>
          <div className="gm-panel-card">
            <strong>{selectedTokenCharacter.name}</strong>
            <p className="gm-panel-muted">
              {selectedTokenCharacter.class_name} niv.{selectedTokenCharacter.level}
            </p>
          </div>
        </section>
      )}

      {/* ── Delete ─────────────────────────────────────────────────── */}
      <section className="gm-panel-section">
        <div className="gm-panel-actions">
          <button
            className="danger"
            onClick={() => {
              if (confirm(`Supprimer le token "${selectedToken.name || "sans nom"}" ?`)) {
                void updateField("deleted", true);
                onDeselectToken();
              }
            }}
            type="button"
            disabled={busy}
          >
            <Trash2 size={12} /> Supprimer
          </button>
        </div>
      </section>
    </div>
  );
}
