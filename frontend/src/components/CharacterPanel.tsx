import type { FormEvent } from "react";
import { HeartPulse, Plus, ScrollText } from "lucide-react";

import type { Character } from "../api/types";

type CharacterPanelProps = {
  characters: Character[];
  selectedCharacter: Character | undefined;
  isBusy: boolean;
  onCreateCharacter: (event: FormEvent<HTMLFormElement>) => void;
  onSelectCharacter: (characterId: string) => void;
};

export function CharacterPanel({
  characters,
  selectedCharacter,
  isBusy,
  onCreateCharacter,
  onSelectCharacter,
}: CharacterPanelProps) {
  return (
    <div className="character-section">
      <div className="section-heading">
        <h3>Personnages</h3>
        <ScrollText aria-hidden="true" />
      </div>

      <form className="character-form" onSubmit={onCreateCharacter}>
        <label>
          Nom
          <input name="name" minLength={2} maxLength={120} required />
        </label>

        <label>
          Origine
          <input name="ancestry" maxLength={80} placeholder="Humain, elfe..." />
        </label>

        <label>
          Classe
          <input name="class_name" maxLength={80} placeholder="Guerrier, mage..." />
        </label>

        <div className="mini-grid">
          <label>
            Niveau
            <input name="level" type="number" min={1} max={20} defaultValue={1} />
          </label>

          <label>
            PV max
            <input name="hp_max" type="number" min={1} defaultValue={10} />
          </label>

          <label>
            CA
            <input name="armor_class" type="number" min={1} max={40} defaultValue={10} />
          </label>

          <label>
            Vitesse
            <input name="speed" type="number" min={0} max={200} defaultValue={30} />
          </label>
        </div>

        <div className="ability-grid" aria-label="Caracteristiques">
          {(["str", "dex", "con", "int", "wis", "cha"] as const).map((ability) => (
            <label key={ability}>
              {ability.toUpperCase()}
              <input name={ability} type="number" min={1} max={30} defaultValue={10} />
            </label>
          ))}
        </div>

        <label>
          Notes
          <textarea name="notes" rows={3} maxLength={4000} />
        </label>

        <button className="primary-button" disabled={isBusy} type="submit">
          <Plus aria-hidden="true" />
          Ajouter la fiche
        </button>
      </form>

      <div className="character-layout">
        <div className="character-list">
          {characters.length === 0 ? (
            <div className="empty-state compact-empty">
              <ScrollText aria-hidden="true" />
              <p>Aucune fiche dans cette campagne.</p>
            </div>
          ) : (
            characters.map((character) => (
              <button
                className={`character-row ${selectedCharacter?.id === character.id ? "selected" : ""}`}
                key={character.id}
                onClick={() => onSelectCharacter(character.id)}
                type="button"
              >
                <span>
                  <strong>{character.name}</strong>
                  <small>
                    Niv. {character.level} {character.class_name || "Aventurier"}
                  </small>
                </span>
                <em>{character.hp_current}/{character.hp_max} PV</em>
              </button>
            ))
          )}
        </div>

        {selectedCharacter && (
          <article className="sheet-preview">
            <div className="sheet-title">
              <div>
                <h4>{selectedCharacter.name}</h4>
                <p>
                  {selectedCharacter.ancestry || "Origine libre"} ·{" "}
                  {selectedCharacter.class_name || "Classe libre"} · niveau {selectedCharacter.level}
                </p>
              </div>
              <HeartPulse aria-hidden="true" />
            </div>

            <div className="stat-strip">
              <span>CA {selectedCharacter.armor_class}</span>
              <span>PV {selectedCharacter.hp_current}/{selectedCharacter.hp_max}</span>
              <span>VIT {selectedCharacter.speed}</span>
              <span>PB +{selectedCharacter.proficiency_bonus}</span>
            </div>

            <div className="ability-summary">
              {Object.entries(selectedCharacter.attributes).map(([key, value]) => (
                <span key={key}>
                  <strong>{key.toUpperCase()}</strong>
                  {value}
                </span>
              ))}
            </div>

            {selectedCharacter.notes && <p className="sheet-notes">{selectedCharacter.notes}</p>}
          </article>
        )}
      </div>
    </div>
  );
}
