import { Eye, EyeOff, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";

import type { Character, Scene, SceneToken } from "../api/types";

type TokenPosition = {
  x: number;
  y: number;
};

type TokenDetailPanelProps = {
  selectedScene: Scene | undefined;
  selectedToken: SceneToken | undefined;
  selectedTokenCharacter: Character | undefined;
  selectedTokenPosition: TokenPosition | undefined;
  token: string;
  onCenterSelectedToken?: () => void;
  onDeselectToken: () => void;
  onNudgeSelectedToken: (dx: number, dy: number) => void;
  onTokenUpdated?: (updated: SceneToken) => void;
};

const HOSTILITY_OPTIONS = [
  { value: "hostile", label: "Hostile", color: "#ef4444" },
  { value: "neutral", label: "Neutre", color: "#f59e0b" },
  { value: "ally", label: "Allié", color: "#22c55e" },
] as const;

export function TokenDetailPanel({
  selectedScene,
  selectedToken,
  selectedTokenCharacter,
  selectedTokenPosition,
  token,
  onCenterSelectedToken,
  onDeselectToken,
  onNudgeSelectedToken,
  onTokenUpdated,
}: TokenDetailPanelProps) {
  const step = selectedScene?.grid_size ?? 50;

  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [busy, setBusy] = useState(false);

  const headers = useMemo(
    () => ({
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    }),
    [token],
  );

  // ── PATCH helper ────────────────────────────────────────────────────

  async function patchToken(updates: Record<string, unknown>) {
    if (!selectedToken) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/tokens/${selectedToken.id}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify(updates),
      });
      if (res.ok) {
        const updated: SceneToken = await res.json();
        onTokenUpdated?.(updated);
      }
    } catch {
      /* ignore */
    } finally {
      setBusy(false);
    }
  }

  // ── Inline edit ─────────────────────────────────────────────────────

  function startEdit(field: string, initial: string) {
    setEditingField(field);
    setEditValue(initial);
  }

  function commitEdit(field: string, value: string) {
    setEditingField(null);
    if (!selectedToken) return;
    const trimmed = value.trim();
    if (!trimmed) return;

    if (field === "name" && trimmed !== selectedToken.name) {
      void patchToken({ name: trimmed });
    } else if (field === "x" || field === "y") {
      const num = Number.parseInt(trimmed, 10);
      if (Number.isFinite(num) && num !== selectedToken[field]) {
        void patchToken({ [field]: num });
      }
    } else if (field === "size") {
      const num = Number.parseInt(trimmed, 10);
      if (Number.isFinite(num) && num >= 1 && num <= 8 && num !== selectedToken.size) {
        void patchToken({ size: num });
      }
    } else if (field === "color") {
      if (trimmed !== selectedToken.color) {
        void patchToken({ color: trimmed });
      }
    }
  }

  function handleKeyDown(e: React.KeyboardEvent, field: string) {
    if (e.key === "Enter") commitEdit(field, editValue);
    if (e.key === "Escape") setEditingField(null);
  }

  // ── Actions ─────────────────────────────────────────────────────────

  function toggleHidden() {
    if (!selectedToken) return;
    void patchToken({ is_hidden: !selectedToken.is_hidden });
  }

  async function deleteToken() {
    if (!selectedToken) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/tokens/${selectedToken.id}`, { method: "DELETE", headers });
      if (res.ok) {
        onDeselectToken();
        onTokenUpdated?.(selectedToken);
      }
    } catch {
      /* ignore */
    } finally {
      setBusy(false);
    }
  }

  async function duplicateToken() {
    if (!selectedToken || !selectedScene) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/scenes/${selectedScene.id}/tokens`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          name: `${selectedToken.name} (copie)`,
          x: selectedToken.x + 50,
          y: selectedToken.y + 50,
          color: selectedToken.color,
          size: selectedToken.size,
          character_id: selectedToken.character_id,
        }),
      });
      if (res.ok) {
        const dup: SceneToken = await res.json();
        onTokenUpdated?.(dup);
      }
    } catch {
      /* ignore */
    } finally {
      setBusy(false);
    }
  }

  function applyHP(delta: number) {
    if (!selectedToken) return;
    const current = (selectedToken.metadata?.hp_current as number) ?? 0;
    const max = (selectedToken.metadata?.hp_max as number) ?? 0;
    const newHp = Math.max(0, Math.min(max || 9999, current + delta));
    void patchToken({ metadata: { ...selectedToken.metadata, hp_current: newHp } });
  }

  function setHostility(value: string) {
    void patchToken({ metadata: { ...selectedToken?.metadata, hostility: value } });
  }

  // ── Inline field renderer ───────────────────────────────────────────

  function EditableField({
    field,
    value,
    type = "text",
    className = "",
  }: {
    field: string;
    value: string;
    type?: string;
    className?: string;
  }) {
    if (editingField === field) {
      return (
        <input
          autoFocus
          className={`token-detail-edit-input ${className}`}
          onBlur={() => commitEdit(field, editValue)}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={(e) => handleKeyDown(e, field)}
          type={type}
          value={editValue}
        />
      );
    }
    return (
      <span
        className={`token-detail-editable ${className}`}
        onClick={() => startEdit(field, value)}
        title="Cliquer pour modifier"
      >
        {value}
      </span>
    );
  }

  // ── No token selected ───────────────────────────────────────────────

  if (!selectedToken || !selectedTokenPosition) {
    return (
      <div className="gm-panel-content token-detail-panel" data-vtt-panel>
        <section className="gm-panel-section">
          <header className="gm-panel-section-header">
            <strong>Aucune sélection</strong>
          </header>
          <p className="gm-panel-muted">
            Sélectionne un token sur la carte ou dans la liste pour afficher ses détails.
          </p>
        </section>
      </div>
    );
  }

  const hostility = (selectedToken.metadata?.hostility as string) ?? "neutral";
  const hpCurrent = (selectedToken.metadata?.hp_current as number) ?? null;
  const hpMax = (selectedToken.metadata?.hp_max as number) ?? null;

  // ── Main render ─────────────────────────────────────────────────────

  return (
    <div className="gm-panel-content token-detail-panel" data-vtt-panel>
      {/* ── Identity ─────────────────────────────────────────────── */}
      <section className="gm-panel-section">
        <header className="gm-panel-section-header">
          <EditableField field="name" value={selectedToken.name} />
          <small>
            {selectedTokenCharacter?.name ?? "Token libre"}
          </small>
        </header>
      </section>

      {/* ── Position ─────────────────────────────────────────────── */}
      <section className="gm-panel-section">
        <header className="gm-panel-section-header">
          <strong>Position</strong>
          <small>Pas de {step}px</small>
        </header>

        <div className="gm-panel-context">
          <span className="gm-panel-stat">
            <small>X</small>
            <EditableField field="x" value={String(selectedTokenPosition.x)} />
          </span>
          <span className="gm-panel-stat">
            <small>Y</small>
            <EditableField field="y" value={String(selectedTokenPosition.y)} />
          </span>
          <span className="gm-panel-stat">
            <small>Taille</small>
            <EditableField field="size" value={String(selectedToken.size)} />
          </span>
          <span className="gm-panel-stat">
            <small>Visibilité</small>
            <button
              className={`token-detail-toggle ${selectedToken.is_hidden ? "hidden" : ""}`}
              disabled={busy}
              onClick={toggleHidden}
              type="button"
            >
              {selectedToken.is_hidden ? <><EyeOff size={12} /> Caché</> : <><Eye size={12} /> Visible</>}
            </button>
          </span>
        </div>
      </section>

      {/* ── Appearance ───────────────────────────────────────────── */}
      <section className="gm-panel-section">
        <header className="gm-panel-section-header">
          <strong>Apparence</strong>
        </header>

        <div className="gm-panel-context">
          <span className="gm-panel-stat">
            <small>Couleur</small>
            <span className="token-detail-color-row">
              <span
                className="token-detail-color-swatch"
                style={{ background: selectedToken.color }}
              />
              <EditableField field="color" value={selectedToken.color} />
            </span>
          </span>

          <span className="gm-panel-stat">
            <small>Attitude</small>
            <div className="gm-panel-actions">
              {HOSTILITY_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  className={hostility === opt.value ? "active" : ""}
                  disabled={busy}
                  onClick={() => setHostility(opt.value)}
                  style={hostility === opt.value ? { borderColor: opt.color, color: opt.color } : undefined}
                  type="button"
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </span>
        </div>
      </section>

      {/* ── HP ────────────────────────────────────────────────────── */}
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
              style={{ width: `${Math.max(0, Math.min(100, ((hpCurrent ?? 0) / hpMax) * 100))}%` }}
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

      {/* ── Nudge ─────────────────────────────────────────────────── */}
      <section className="gm-panel-section">
        <header className="gm-panel-section-header">
          <strong>Déplacer</strong>
          <small>Pas de {step}px</small>
        </header>

        <div className="token-detail-nudge-grid" aria-label={`Déplacer ${selectedToken.name}`}>
          <button type="button" onClick={() => onNudgeSelectedToken(0, -step)}>↑</button>
          <button type="button" onClick={() => onNudgeSelectedToken(-step, 0)}>←</button>
          <button type="button" onClick={() => onNudgeSelectedToken(step, 0)}>→</button>
          <button type="button" onClick={() => onNudgeSelectedToken(0, step)}>↓</button>
        </div>
      </section>

      {/* ── Actions ───────────────────────────────────────────────── */}
      <section className="gm-panel-section">
        <header className="gm-panel-section-header">
          <strong>Actions</strong>
        </header>

        <div className="gm-panel-actions">
          {onCenterSelectedToken && (
            <button disabled={busy} onClick={onCenterSelectedToken} type="button">
              Centrer
            </button>
          )}
          <button disabled={busy} onClick={duplicateToken} type="button">
            <Plus size={12} /> Dupliquer
          </button>
          <button disabled={busy} onClick={deleteToken} type="button">
            <Trash2 size={12} /> Supprimer
          </button>
          <button disabled={busy} onClick={onDeselectToken} type="button">
            Désélectionner
          </button>
        </div>
      </section>
    </div>
  );
}
