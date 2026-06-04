import { Bookmark, BookmarkCheck, Dices, Filter, Pin, PinOff } from "lucide-react";
import type { FormEvent } from "react";

import type { Character, GameLogEntry, Roll } from "../api/types";
import { useWorkspaceState } from "../contexts/WorkspaceStateContext";
import { useWorkspaceActions } from "../contexts/WorkspaceActionsContext";
import { usePanelContext } from "../contexts/PanelContext";

const CATEGORIES = [
  { id: "general", label: "General", emoji: "📝" },
  { id: "combat", label: "Combat", emoji: "⚔️" },
  { id: "rp", label: "Roleplay", emoji: "🎭" },
  { id: "exploration", label: "Exploration", emoji: "🗺️" },
  { id: "gm_note", label: "Note MJ", emoji: "🔒" },
] as const;

/** @deprecated Props kept for backward compatibility until all callers use contexts. */
type SessionLogPanelProps = {
  characters?: Character[];
  selectedCharacter?: Character | undefined;
  rolls?: Roll[];
  logEntries?: GameLogEntry[];
  isBusy?: boolean;
  token?: string;
  onRoll?: (event: FormEvent<HTMLFormElement>) => void;
  onAddNote?: (event: FormEvent<HTMLFormElement>) => void;
  onRefresh?: (category?: string) => void;
};

export function SessionLogPanel(props: SessionLogPanelProps = {}) {
  const state = useWorkspaceState();
  const actions = useWorkspaceActions();
  const panel = usePanelContext();

  const characters = props.characters ?? state.characters;
  const selectedCharacter = props.selectedCharacter ?? state.selectedCharacter;
  const rolls = props.rolls ?? state.rolls;
  const logEntries = props.logEntries ?? state.logEntries;
  const isBusy = props.isBusy ?? panel.isBusy;
  const token = props.token ?? state.token;
  const onRoll = props.onRoll ?? actions.handleRoll;
  const onAddNote = props.onAddNote ?? actions.handleLogNote;
  const onRefresh = props.onRefresh;

  const latestRoll = rolls[0];
  const pinnedEntries = logEntries.filter((e) => e.pinned);
  const sessionMarkers = logEntries.filter((e) => e.session_marker);

  async function togglePin(entry: GameLogEntry) {
    try {
      await fetch(`/api/log-entries/${entry.id}/pin`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ pinned: !entry.pinned }),
      });
      onRefresh?.();
    } catch {
      // silent
    }
  }

  async function toggleSessionMarker(entry: GameLogEntry) {
    try {
      await fetch(`/api/log-entries/${entry.id}/session-marker`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ session_marker: !entry.session_marker }),
      });
      onRefresh?.();
    } catch {
      // silent
    }
  }

  return (
    <div className="gm-panel-content session-log-panel" data-vtt-panel>
      {/* ── Quick Roll ─────────────────────────────────────────────── */}
      <section className="gm-panel-section">
        <header className="gm-panel-section-header">
          <strong><Dices size={14} /> Lancer un dé</strong>
        </header>
        <form className="gm-panel-section" onSubmit={onRoll}>
          <label>
            Formule
            <input name="formula" required placeholder="1d20+5" />
          </label>
          <label>
            Label
            <input name="label" placeholder="Jet de perception" />
          </label>
          <div className="mini-grid">
            <label>
              Mode
              <select name="mode" defaultValue="normal">
                <option value="normal">Normal</option>
                <option value="advantage">Avantage</option>
                <option value="disadvantage">Désavantage</option>
              </select>
            </label>
            <label>
              Visibilité
              <select name="visibility" defaultValue="public">
                <option value="public">Public</option>
                <option value="gm">MJ</option>
              </select>
            </label>
          </div>
          <label>
            Personnage
            <select name="character_id" defaultValue="">
              <option value="">Aucun</option>
              {characters.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <div className="gm-panel-actions">
            <button disabled={isBusy} type="submit">
              <Dices size={12} /> Lancer
            </button>
          </div>
        </form>
      </section>

      {/* ── Latest Roll ──────────────────────────────────────────────── */}
      {latestRoll && (
        <section className="gm-panel-section">
          <header className="gm-panel-section-header">
            <strong>Dernier jet</strong>
          </header>
          <div className="gm-panel-card selected">
            <p>
              <strong>{latestRoll.label || latestRoll.formula}</strong>
              {" → "}
              <span style={{ fontSize: "1.2rem", fontWeight: 800 }}>
                {latestRoll.total}
              </span>
            </p>
          </div>
        </section>
      )}

      {/* ── Stats ──────────────────────────────────────────────────────── */}
      <section className="gm-panel-section">
        <header className="gm-panel-section-header">
          <strong>Statistiques</strong>
          <small>
            {rolls.length} jet(s) · {pinnedEntries.length} epingle(s) · {sessionMarkers.length}{" "}
            session(s)
          </small>
        </header>
      </section>

      {/* ── Add Note ─────────────────────────────────────────────────── */}
      <section className="gm-panel-section">
        <header className="gm-panel-section-header">
          <strong>Ajouter une note</strong>
        </header>
        <form className="gm-panel-section" onSubmit={onAddNote}>
          <label>
            Message
            <textarea name="message" rows={2} required placeholder="Note de session..." />
          </label>
          <label>
            Visibilité
            <select name="visibility" defaultValue="gm">
              <option value="public">Public</option>
              <option value="gm">MJ</option>
            </select>
          </label>
          <div className="gm-panel-actions">
            <button disabled={isBusy} type="submit">
              Ajouter
            </button>
          </div>
        </form>
      </section>

      {/* ── Category filters ──────────────────────────────────────────── */}
      <section className="gm-panel-section">
        <header className="gm-panel-section-header">
          <strong><Filter size={12} /> Filtrer</strong>
        </header>
        <div className="category-filter-list">
          <button className="ghost-button compact" onClick={() => onRefresh?.()} type="button">
            Tous
          </button>
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              className="ghost-button compact"
              onClick={() => onRefresh?.(cat.id)}
              type="button"
            >
              {cat.emoji} {cat.label}
            </button>
          ))}
        </div>
      </section>

      {/* ── Pinned Entries ─────────────────────────────────────────────── */}
      {pinnedEntries.length > 0 && (
        <section className="gm-panel-section">
          <header className="gm-panel-section-header">
            <strong><Pin size={12} /> Épinglés</strong>
          </header>
          <div className="gm-panel-list">
            {pinnedEntries.map((e) => (
              <div className="gm-panel-row" key={e.id}>
                <span>
                  <small>{new Date(e.created_at).toLocaleTimeString()}</small>
                  <span>{e.message}</span>
                </span>
                <button
                  className="ghost-button compact"
                  onClick={() => void togglePin(e)}
                  type="button"
                  title="Désépingler"
                >
                  <PinOff size={12} />
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── All Entries ───────────────────────────────────────────────── */}
      <section className="gm-panel-section">
        <header className="gm-panel-section-header">
          <strong>Journal</strong>
          <small>{logEntries.length} entrée(s)</small>
        </header>
        <div className="gm-panel-list" style={{ maxHeight: 400 }}>
          {logEntries.length === 0 ? (
            <p className="gm-panel-muted">Aucune entrée de journal.</p>
          ) : (
            logEntries.map((e) => (
              <div
                className={`gm-panel-row ${e.pinned ? "selected" : ""} ${e.session_marker ? "session-marker" : ""}`}
                key={e.id}
              >
                <span>
                  <small>
                    {new Date(e.created_at).toLocaleTimeString()}
                    {e.category && ` · ${e.category}`}
                    {e.visibility === "gm" && " · MJ"}
                  </small>
                  <span>{e.message}</span>
                </span>
                <span style={{ display: "flex", gap: 4 }}>
                  <button
                    className="ghost-button compact"
                    onClick={() => void toggleSessionMarker(e)}
                    type="button"
                    title={e.session_marker ? "Retirer marqueur" : "Marquer session"}
                  >
                    {e.session_marker ? <BookmarkCheck size={12} /> : <Bookmark size={12} />}
                  </button>
                  <button
                    className="ghost-button compact"
                    onClick={() => void togglePin(e)}
                    type="button"
                    title={e.pinned ? "Désépingler" : "Épingler"}
                  >
                    {e.pinned ? <PinOff size={12} /> : <Pin size={12} />}
                  </button>
                </span>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
