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
  return (
    <div className="session-section">
      <div className="section-heading">
        <h3>Session live</h3>
        <Dices aria-hidden="true" />
      </div>

      <div className="session-grid">
        <section className="roll-panel">
          <h4>Lancer les des</h4>

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
        </section>

        <section className="note-panel">
          <h4>Note de session</h4>

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
        </section>

        <section className="roll-history">
          <h4>Derniers jets</h4>

          {rolls.length === 0 ? (
            <p className="muted">Aucun jet pour cette session.</p>
          ) : (
            rolls.slice(0, 8).map((roll) => (
              <article className="roll-row" key={roll.id}>
                <span>
                  <strong>{roll.label || roll.formula}</strong>
                  <small>
                    {roll.formula} - {roll.mode} - {roll.visibility}
                  </small>
                </span>
                <em>{roll.total}</em>
              </article>
            ))
          )}
        </section>

        <section className="log-panel">
          <h4>Journal</h4>

          {logEntries.length === 0 ? (
            <p className="muted">Le journal est vide.</p>
          ) : (
            logEntries.slice(0, 10).map((entry) => (
              <article className={`log-row ${entry.entry_type}`} key={entry.id}>
                <span>{entry.message}</span>
                <small>{entry.visibility}</small>
              </article>
            ))
          )}
        </section>
      </div>
    </div>
  );
}
