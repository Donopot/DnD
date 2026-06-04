import { ArrowDownToLine, ArrowUpToLine, Eye, EyeOff, Plus, Trash2 } from "lucide-react";
import { useContext, useMemo, useState } from "react";

import { apiRequest } from "../api/client";
import type { Character, Scene, SceneToken } from "../api/types";
import { WorkspaceStateContext } from "../contexts/WorkspaceStateContext";
import { WorkspaceActionsContext } from "../contexts/WorkspaceActionsContext";
import { VttContext } from "../contexts/VttContext";

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
  const state = useContext(WorkspaceStateContext);
  const actions = useContext(WorkspaceActionsContext);
  const vtt = useContext(VttContext);

  const authToken = props.token ?? state?.token ?? "";
  const selectedTokenId = vtt?.selectedTokenId ?? props.selectedToken?.id ?? "";
  const selectedToken =
    props.selectedToken ?? state?.sceneTokens.find((t) => t.id === selectedTokenId);
  const selectedScene = props.selectedScene ?? state?.selectedScene;
  const selectedTokenCharacter = props.selectedTokenCharacter ?? (
    selectedToken?.character_id
      ? state?.characters.find((c) => c.id === selectedToken.character_id)
      : undefined
  );
  const selectedTokenPosition = props.selectedTokenPosition ?? (
    selectedToken ? { x: selectedToken.x, y: selectedToken.y } : undefined
  );
  const onDeselectToken = props.onDeselectToken ?? (() => vtt?.setSelectedTokenId(""));
  const onNudgeSelectedToken = props.onNudgeSelectedToken ?? ((dx: number, dy: number) => {
    if (selectedToken) void actions?.handleMoveToken(selectedToken, dx, dy);
  });
  const onTokenUpdated = props.onTokenUpdated;

  const step = selectedScene?.grid_size ?? 50;

  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [busy, setBusy] = useState(false);

  async function patchToken(payload: Partial<SceneToken>) {
    if (!selectedToken) return;
    setBusy(true);
    try {
      const updated = await apiRequest<SceneToken>(`/api/tokens/${selectedToken.id}`, authToken, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
      onTokenUpdated?.(updated);
    } catch {
      // silent
    } finally {
      setBusy(false);
      setEditingField(null);
    }
  }

  function updateField(field: string, value: unknown) {
    if (!selectedToken) return;

    if (field === "name") {
      const name = String(value).trim();
      if (name && name !== selectedToken.name) void patchToken({ name });
      return;
    }

    if (field === "size") {
      const size = Number(value);
      if (Number.isFinite(size) && size >= 1 && size <= 8 && size !== selectedToken.size) {
        void patchToken({ size });
      }
      return;
    }

    if (field === "color") {
      const color = String(value).trim();
      if (color && color !== selectedToken.color) void patchToken({ color });
      return;
    }

    if (field === "hostility") {
      void patchToken({
        metadata: { ...selectedToken.metadata, hostility: String(value) },
      } as Partial<SceneToken>);
    }
  }

  async function deleteToken() {
    if (!selectedToken) return;
    setBusy(true);
    try {
      await apiRequest(`/api/tokens/${selectedToken.id}`, authToken, { method: "DELETE" });
      onDeselectToken();
    } catch {
      // silent
    } finally {
      setBusy(false);
    }
  }

  async function duplicateToken() {
    if (!selectedToken) return;
    setBusy(true);
    try {
      const updated = await apiRequest<SceneToken>(`/api/tokens/${selectedToken.id}/duplicate`, authToken, { method: "POST" });
      onTokenUpdated?.(updated);
    } catch {
      // silent
    } finally {
      setBusy(false);
    }
  }

  async function bringForward() {
    if (!selectedToken) return;
    setBusy(true);
    try {
      const updated = await apiRequest<SceneToken>(`/api/tokens/${selectedToken.id}/bring-forward`, authToken, { method: "POST" });
      onTokenUpdated?.(updated);
    } catch {
      // silent
    } finally {
      setBusy(false);
    }
  }

  async function sendBackward() {
    if (!selectedToken) return;
    setBusy(true);
    try {
      const updated = await apiRequest<SceneToken>(`/api/tokens/${selectedToken.id}/send-backward`, authToken, { method: "POST" });
      onTokenUpdated?.(updated);
    } catch {
      // silent
    } finally {
      setBusy(false);
    }
  }

  function applyHP(delta: number) {
    if (!selectedToken) return;
    const current = (selectedToken.metadata?.hp_current as number) ?? 0;
    const max = (selectedToken.metadata?.hp_max as number) ?? 0;
    const nextHp = Math.max(0, Math.min(max || 9999, current + delta));
    void patchToken({
      metadata: { ...selectedToken.metadata, hp_current: nextHp },
    } as Partial<SceneToken>);
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

  const hpCurrent =
    typeof selectedToken.metadata?.hp_current === "number"
      ? selectedToken.metadata.hp_current
      : null;
  const hpMax =
    typeof selectedToken.metadata?.hp_max === "number" ? selectedToken.metadata.hp_max : null;

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
                onBlur={() => updateField("name", editValue)}
                onKeyDown={(e) => e.key === "Enter" && updateField("name", editValue)}
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
              <input
                autoFocus
                type="number"
                min={1}
                max={8}
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onBlur={() => updateField("size", editValue)}
                onKeyDown={(e) => e.key === "Enter" && updateField("size", editValue)}
                className="token-detail-edit-input"
              />
            ) : (
              <span
                className="token-detail-editable"
                onClick={() => startEdit("size", selectedToken.size ?? 1)}
              >
                {selectedToken.size ?? 1}
              </span>
            )}
          </div>

          {/* Color */}
          <div className="gm-panel-row">
            <span>Couleur</span>
            <span className="token-detail-color-row">
              <span
                className="token-detail-color-swatch"
                style={{ background: selectedToken.color }}
              />
              <input
                type="color"
                value={selectedToken.color}
                onChange={(e) => updateField("color", e.target.value)}
                disabled={busy}
                title="Changer la couleur"
              />
            </span>
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
                if (actions) {
                  void actions.handleToggleTokenHidden(selectedToken).then(() => {
                    onTokenUpdated?.({ ...selectedToken, is_hidden: !selectedToken.is_hidden });
                  });
                } else {
                  void patchToken({ is_hidden: !selectedToken.is_hidden });
                }
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

      {hpMax !== null && hpMax > 0 && (
        <section className="gm-panel-section">
          <header className="gm-panel-section-header">
            <strong>Points de vie</strong>
            <small>
              {hpCurrent ?? "?"} / {hpMax}
            </small>
          </header>

          <div className="gm-panel-progress">
            <div
              className="gm-panel-progress-fill"
              style={{
                width: `${Math.max(
                  0,
                  Math.min(
                    100,
                    ((hpCurrent ?? 0) / hpMax) * 100,
                  ),
                )}%`,
              }}
            />
          </div>

          <div className="gm-panel-actions">
            <button disabled={busy} onClick={() => applyHP(-5)} type="button">-5</button>
            <button disabled={busy} onClick={() => applyHP(-1)} type="button">-1</button>
            <button disabled={busy} onClick={() => applyHP(1)} type="button">+1</button>
            <button disabled={busy} onClick={() => applyHP(5)} type="button">+5</button>
          </div>
        </section>
      )}

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
        <header className="gm-panel-section-header">
          <strong>Actions</strong>
        </header>
        <div className="gm-panel-actions">
          {props.onCenterSelectedToken && (
            <button disabled={busy} onClick={props.onCenterSelectedToken} type="button">
              Centrer
            </button>
          )}
          <button disabled={busy} onClick={() => void duplicateToken()} type="button">
            <Plus size={12} /> Dupliquer
          </button>
          <button disabled={busy} onClick={() => void bringForward()} type="button" title="Mettre au premier plan">
            <ArrowUpToLine size={12} /> Devant
          </button>
          <button disabled={busy} onClick={() => void sendBackward()} type="button" title="Mettre a l'arriere-plan">
            <ArrowDownToLine size={12} /> Derriere
          </button>
          <button
            className="danger"
            onClick={() => {
              if (confirm(`Supprimer le token "${selectedToken.name || "sans nom"}" ?`)) {
                void deleteToken();
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
