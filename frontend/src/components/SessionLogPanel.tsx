import type { FormEvent } from "react";
import { Dices } from "lucide-react";

import type { Character, GameLogEntry, Roll } from "../api/types";

type SessionLogPanelProps = {
  characters: Character[];
  selectedCharacter: Character | undefined;
  rolls: Roll[];
  logEntries: GameLogEntry[];
  isBusy: boolean;
  onRoll: (event: FormEvent<HTMLFormElement>) => void;
  onAddNote: (event: FormEvent<HTMLFormElement>) => void;
};

export function SessionLogPanel({
  characters,
  selectedCharacter,
  rolls,
  logEntries,
  isBusy,
  onRoll,
  onAddNote,
}: SessionLogPanelProps) {
  const latestRoll = rolls[0];
  const publicLogCount = logEntries.filter((entry) => entry.visibility === "public").length;
  const gmLogCount = logEntries.filter((entry) => entry.visibility === "gm").length;

  return (
    <div className="session-section">
      <div className="section-heading">
        <h3>Journal</h3>
        <Dices aria-hidden="true" />
      </div>

      <div className="session-command-card">
        <div>
          <span className="session-status">Session live</span>
          <h4>{latestRoll ? `${latestRoll.label || latestRoll.formula} = ${latestRoll.total}` : "Aucun jet recent"}</h4>
          <p>
            {rolls.length} jet(s) · {publicLogCount} public · {gmLogCount} MJ
          </p>
        </div>
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
        </aside>

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

        <section className="session-history-card">
          <div className="session-subheading">
            <h4>Journal</h4>
            <small>{logEntries.length} entree(s)</small>
          </div>

          {logEntries.length === 0 ? (
            <p className="muted">Le journal est vide.</p>
          ) : (
            <div className="compact-log-list">
              {logEntries.slice(0, 12).map((entry) => (
                <article className={`compact-log-row ${entry.entry_type}`} key={entry.id}>
                  <span>{entry.message}</span>
                  <small>{entry.visibility}</small>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
