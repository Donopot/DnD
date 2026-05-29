import type { FormEvent } from "react";
import { Shield } from "lucide-react";

import type { Character, Combatant, Encounter, SceneToken } from "../api/types";

type CombatPanelProps = {
  encounters: Encounter[];
  selectedEncounter: Encounter | undefined;
  combatants: Combatant[];
  characters: Character[];
  selectedCharacter: Character | undefined;
  sceneTokens: SceneToken[];
  isBusy: boolean;
  onCreateEncounter: (event: FormEvent<HTMLFormElement>) => void;
  onSelectEncounter: (encounterId: string) => void;
  onLoadEncounterDetail: (encounterId: string) => void;
  onStartEncounter: () => void;
  onNextTurn: () => void;
  onEndEncounter: () => void;
  onAddCombatant: (event: FormEvent<HTMLFormElement>) => void;
  onAdjustCombatantHp: (combatant: Combatant, delta: number) => void;
  onToggleDefeated: (combatant: Combatant) => void;
};

export function CombatPanel({
  encounters,
  selectedEncounter,
  combatants,
  characters,
  selectedCharacter,
  sceneTokens,
  isBusy,
  onCreateEncounter,
  onSelectEncounter,
  onLoadEncounterDetail,
  onStartEncounter,
  onNextTurn,
  onEndEncounter,
  onAddCombatant,
  onAdjustCombatantHp,
  onToggleDefeated,
}: CombatPanelProps) {
  return (
    <div className="combat-section">
      <div className="section-heading">
        <h3>Combat</h3>
        <Shield aria-hidden="true" />
      </div>

      <div className="combat-layout">
        <section className="combat-panel">
          <div className="combat-toolbar">
            <div>
              <strong>{selectedEncounter?.name ?? "Aucun combat"}</strong>
              {selectedEncounter && (
                <small>
                  {selectedEncounter.status} - round {selectedEncounter.round_number}
                </small>
              )}
            </div>

            {encounters.length > 1 && (
              <select
                value={selectedEncounter?.id ?? ""}
                onChange={(event) => {
                  onSelectEncounter(event.target.value);
                  onLoadEncounterDetail(event.target.value);
                }}
              >
                {encounters.map((encounter) => (
                  <option key={encounter.id} value={encounter.id}>
                    {encounter.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          <form className="encounter-form" onSubmit={onCreateEncounter}>
            <label>
              Nouveau combat
              <input name="name" minLength={2} maxLength={120} placeholder="Embuscade gobeline" required />
            </label>

            <button className="ghost-button" disabled={isBusy} type="submit">
              Creer combat
            </button>
          </form>

          <div className="combat-action-row">
            <button className="primary-button" disabled={isBusy || !selectedEncounter} onClick={onStartEncounter} type="button">
              Demarrer
            </button>

            <button className="ghost-button" disabled={isBusy || !selectedEncounter} onClick={onNextTurn} type="button">
              Tour suivant
            </button>

            <button className="ghost-button" disabled={isBusy || !selectedEncounter} onClick={onEndEncounter} type="button">
              Terminer
            </button>
          </div>

          <div className="initiative-list">
            {combatants.length === 0 ? (
              <p className="muted">Aucun combattant dans ce combat.</p>
            ) : (
              combatants.map((combatant) => (
                <article
                  className={`combatant-row ${
                    selectedEncounter?.active_combatant_id === combatant.id ? "active" : ""
                  } ${combatant.is_defeated ? "defeated" : ""}`}
                  key={combatant.id}
                >
                  <div className="initiative-score">{combatant.initiative}</div>

                  <div className="combatant-main">
                    <strong>{combatant.name}</strong>
                    <small>
                      CA {combatant.armor_class ?? "-"} - PV {combatant.hp_current ?? "-"}/{combatant.hp_max ?? "-"}
                    </small>
                    {combatant.conditions.length > 0 && (
                      <small>Conditions: {combatant.conditions.join(", ")}</small>
                    )}
                  </div>

                  <div className="combatant-actions">
                    <button type="button" onClick={() => onAdjustCombatantHp(combatant, -1)}>
                      -1
                    </button>
                    <button type="button" onClick={() => onAdjustCombatantHp(combatant, 1)}>
                      +1
                    </button>
                    <button type="button" onClick={() => onToggleDefeated(combatant)}>
                      {combatant.is_defeated ? "Relever" : "KO"}
                    </button>
                  </div>
                </article>
              ))
            )}
          </div>
        </section>

        <section className="combat-panel">
          <h4>Ajouter un combattant</h4>

          <form className="combatant-form" onSubmit={onAddCombatant}>
            <label>
              Personnage
              <select name="character_id" defaultValue={selectedCharacter?.id ?? ""}>
                <option value="">Aucun personnage</option>
                {characters.map((character) => (
                  <option key={character.id} value={character.id}>
                    {character.name}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Token
              <select name="token_id" defaultValue="">
                <option value="">Aucun token</option>
                {sceneTokens.map((token) => (
                  <option key={token.id} value={token.id}>
                    {token.name}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Nom
              <input name="name" maxLength={120} placeholder={selectedCharacter?.name ?? "Gobelin"} />
            </label>

            <div className="mini-grid three">
              <label>
                Init
                <input name="initiative" type="number" min={-20} max={60} defaultValue={10} />
              </label>

              <label>
                CA
                <input name="armor_class" type="number" min={1} max={40} defaultValue={selectedCharacter?.armor_class ?? 10} />
              </label>

              <label>
                PV
                <input name="hp_current" type="number" min={0} defaultValue={selectedCharacter?.hp_current ?? 8} />
              </label>
            </div>

            <label>
              PV max
              <input name="hp_max" type="number" min={0} defaultValue={selectedCharacter?.hp_max ?? 8} />
            </label>

            <button className="primary-button" disabled={isBusy || !selectedEncounter} type="submit">
              Ajouter au combat
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}
