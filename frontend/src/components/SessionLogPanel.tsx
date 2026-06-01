import { Bookmark, BookmarkCheck, Dices, Filter, Pin, PinOff } from "lucide-react";
import type { FormEvent } from "react";

import type { Character, GameLogEntry, Roll } from "../api/types";

const CATEGORIES = [
  { id: "general", label: "General", emoji: "📝" },
  { id: "combat", label: "Combat", emoji: "⚔️" },
  { id: "rp", label: "Roleplay", emoji: "🎭" },
  { id: "exploration", label: "Exploration", emoji: "🗺️" },
  { id: "gm_note", label: "Note MJ", emoji: "🔒" },
] as const;

type SessionLogPanelProps = {
  characters: Character[];
  selectedCharacter: Character | undefined;
  rolls: Roll[];
  logEntries: GameLogEntry[];
  isBusy: boolean;
  token: string;
  onRoll: (event: FormEvent<HTMLFormElement>) => void;
  onAddNote: (event: FormEvent<HTMLFormElement>) => void;
  onRefresh: (category?: string) => void;
};

export function SessionLogPanel({
  characters,
  selectedCharacter,
  rolls,
  logEntries,
  isBusy,
  token,
  onRoll,
  onAddNote,
  onRefresh,
}: SessionLogPanelProps) {
  const latestRoll = rolls[0];
  const pinnedEntries = logEntries.filter((e) => e.pinned);
  const sessionMarkers = logEntries.filter((e) => e.session_marker);

  async function togglePin(entry: GameLogEntry) {
    try {
      await fetch(`/api/campaigns/${entry.campaign_id}/log/${entry.id}/pin`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ pinned: !entry.pinned }),
      });
      onRefresh();
    } catch {
      // silently ignore
    }
  }

  async function setCategory(entry: GameLogEntry, category: string) {
    try {
      await fetch(`/api/campaigns/${entry.campaign_id}/log/${entry.id}/category`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ category }),
      });
      onRefresh();
    } catch {
      // silently ignore
    }
  }

  async function createSessionMarker() {
    try {
      const response = await fetch(
        `/api/campaigns/${logEntries[0]?.campaign_id}/log/session-marker`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ label: "Nouvelle session" }),
        },
      );
      if (response.ok) {
        onRefresh();
      }
    } catch {
      // silently ignore
    }
  }

  return (
    <div className="session-section">
      <div className="section-heading">
        <h3>Journal</h3>
        <Dices aria-hidden="true" />
      </div>

      <div className="session-command-card">
        <div>
          <span className="session-status">Session live</span>
          <h4>
            {latestRoll
              ? `${latestRoll.label || latestRoll.formula} = ${latestRoll.total}`
              : "Aucun jet recent"}
          </h4>
          <p>
            {rolls.length} jet(s) · {pinnedEntries.length} epingle(s) · {sessionMarkers.length} session(s)
          </p>
        </div>
        <button className="ghost-button compact" onClick={createSessionMarker} disabled={isBusy} type="button" title="Marquer debut de session">
          <Bookmark size={14} /> Session
        </button>
      </div>

      <div className="session-compact-layout">
        <aside className="session-tools-card">
          <details className="tool-card" data-quick-panel="roll" open>
            <summary>Lancer les des</summary>

            <form className="form-stack" onSubmit={onRoll}>
              <label>
                Personnage
                <select name="character_id" defaultValue={selectedCharacter?.id ?? ""}>
                  <option value="">Jet libre</option>
                  {characters.map((character) => (
                    <option key={character.id} value={character.id}>
                      {character.name}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Libelle
                <input name="label" maxLength={120} placeholder="Attaque, perception..." />
              </label>

              <label>
                Formule
                <input name="formula" defaultValue="1d20" required />
              </label>

              <div className="mini-grid three">
                <label>
                  Mode
                  <select name="mode" defaultValue="normal">
                    <option value="normal">Normal</option>
                    <option value="advantage">Avantage</option>
                    <option value="disadvantage">Desavantage</option>
                  </select>
                </label>

                <label>
                  Visibilite
                  <select name="visibility" defaultValue="public">
                    <option value="public">Public</option>
                    <option value="gm">MJ</option>
                  </select>
                </label>
              </div>

              <button className="primary-button" disabled={isBusy} type="submit">
                Lancer
              </button>
            </form>
          </details>

          <details className="tool-card" data-quick-panel="note">
            <summary>Note de session</summary>

            <form className="form-stack" onSubmit={onAddNote}>
              <label>
                Message
                <textarea name="message" rows={4} maxLength={2000} required />
              </label>

              <label>
                Visibilite
                <select name="visibility" defaultValue="public">
                  <option value="public">Public</option>
                  <option value="gm">MJ</option>
                </select>
              </label>

              <button className="ghost-button" disabled={isBusy} type="submit">
                Ajouter au journal
              </button>
            </form>
          </details>

          {/* Category filters */}
          <details className="tool-card">
            <summary>
              <Filter size={12} /> Categories
            </summary>
            <div className="category-filter-list">
              <button
                className="ghost-button compact"
                onClick={() => onRefresh()}
                type="button"
              >
                Tous
              </button>
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  className="ghost-button compact"
                  onClick={() => onRefresh(cat.id)}
                  type="button"
                >
                  {cat.emoji} {cat.label}
                </button>
              ))}
            </div>
          </details>
        </aside>

        {/* Pinned entries */}
        {pinnedEntries.length > 0 && (
          <section className="session-history-card pinned-section">
            <div className="session-subheading">
              <h4>
                <Pin size={12} /> Epingles
              </h4>
              <small>{pinnedEntries.length}</small>
            </div>
            <div className="compact-log-list">
              {pinnedEntries.map((entry) => (
                <article className={`compact-log-row ${entry.entry_type} pinned`} key={entry.id}>
                  <div className="log-row-content">
                    <span>{entry.message}</span>
                    <small>
                      {CATEGORIES.find((c) => c.id === entry.category)?.emoji}{" "}
                      {entry.category} · {entry.visibility}
                      {entry.session_marker ? " · 🏁 Session" : ""}
                    </small>
                  </div>
                  <button
                    className="ghost-button pin-btn"
                    onClick={() => void togglePin(entry)}
                    title="Depingler"
                    type="button"
                  >
                    <PinOff size={12} />
                  </button>
                </article>
              ))}
            </div>
          </section>
        )}

        {/* Recent rolls */}
        <section className="session-history-card">
          <div className="session-subheading">
            <h4>Derniers jets</h4>
            <small>{rolls.length} total</small>
          </div>

          {rolls.length === 0 ? (
            <p className="muted">Aucun jet pour cette session.</p>
          ) : (
            <div className="compact-roll-list">
              {rolls.slice(0, 8).map((roll) => (
                <article className="compact-roll-row" key={roll.id}>
                  <span>
                    <strong>{roll.label || roll.formula}</strong>
                    <small>
                      {roll.formula} · {roll.mode} · {roll.visibility}
                    </small>
                  </span>
                  <em>{roll.total}</em>
                </article>
              ))}
            </div>
          )}
        </section>

        {/* Log entries with categories */}
        <section className="session-history-card">
          <div className="session-subheading">
            <h4>Journal</h4>
            <small>{logEntries.length} entree(s)</small>
          </div>

          {logEntries.length === 0 ? (
            <p className="muted">Le journal est vide.</p>
          ) : (
            <div className="compact-log-list">
              {logEntries.slice(0, 20).map((entry) => (
                <article className={`compact-log-row ${entry.entry_type} ${entry.pinned ? "pinned" : ""}`} key={entry.id}>
                  <div className="log-row-content">
                    <div className="log-row-header">
                      <span>{entry.message}</span>
                      <div className="log-row-actions">
                        <button
                          className="ghost-button pin-btn"
                          onClick={() => void togglePin(entry)}
                          title={entry.pinned ? "Depingler" : "Epingler"}
                          type="button"
                        >
                          {entry.pinned ? <BookmarkCheck size={12} /> : <Bookmark size={12} />}
                        </button>
                        <select
                          className="category-select"
                          value={entry.category}
                          onChange={(e) => void setCategory(entry, e.target.value)}
                          title="Changer categorie"
                        >
                          {CATEGORIES.map((cat) => (
                            <option key={cat.id} value={cat.id}>
                              {cat.emoji} {cat.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <small>
                      {entry.visibility}
                      {entry.session_marker ? " · 🏁" : ""}
                    </small>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
