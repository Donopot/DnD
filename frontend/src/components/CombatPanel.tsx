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
  const activeCombatant = combatants.find((combatant) => combatant.id === selectedEncounter?.active_combatant_id);
  const defeatedCount = combatants.filter((combatant) => combatant.is_defeated).length;

  return (
    <div className="combat-section">
      <div className="section-heading">
        <h3>Combat</h3>
        <Shield aria-hidden="true" />
      </div>

      <div className="combat-command-card">
        <div className="combat-command-header">
          <div>
            <span className={`combat-status ${selectedEncounter?.status ?? "draft"}`}>
              {selectedEncounter?.status ?? "aucun combat"}
            </span>
            <h4>{selectedEncounter?.name ?? "Aucun combat selectionne"}</h4>
            {selectedEncounter && (
              <p>
                Round {selectedEncounter.round_number} · {combatants.length} combattant(s) · {defeatedCount} KO
              </p>
            )}
          </div>

          {encounters.length > 1 && (
            <label>
              Combat
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
            </label>
          )}
        </div>

        <div className="combat-active-strip">
          <span>Tour actif</span>
          <strong>{activeCombatant?.name ?? "Aucun combattant actif"}</strong>
        </div>

        <div className="combat-action-row compact">
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
      </div>

      <div className="combat-compact-layout">
        <section className="combat-initiative-card">
          <div className="combat-subheading">
            <h4>Initiative</h4>
            <small>{combatants.length} entree(s)</small>
          </div>

          {combatants.length === 0 ? (
            <p className="muted">Aucun combattant dans ce combat.</p>
          ) : (
            <div className="compact-initiative-list">
              {combatants.map((combatant) => (
                <article
                  className={`compact-combatant-row ${
                    selectedEncounter?.active_combatant_id === combatant.id ? "active" : ""
                  } ${combatant.is_defeated ? "defeated" : ""}`}
                  key={combatant.id}
                >
                  <div className="compact-initiative-score">{combatant.initiative}</div>

                  <div className="compact-combatant-main">
                    <strong>{combatant.name}</strong>
                    <small>
                      CA {combatant.armor_class ?? "-"} · PV {combatant.hp_current ?? "-"}/{combatant.hp_max ?? "-"}
                    </small>
                    {combatant.conditions.length > 0 && (
                      <small className="condition-line">{combatant.conditions.join(", ")}</small>
                    )}
                  </div>

                  <div className="compact-combatant-actions">
                    <button type="button" onClick={() => onAdjustCombatantHp(combatant, -1)}>
                      -1
                    </button>
                    <button type="button" onClick={() => onAdjustCombatantHp(combatant, 1)}>
                      +1
                    </button>
                    <button type="button" onClick={() => onToggleDefeated(combatant)}>
                      {combatant.is_defeated ? "OK" : "KO"}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <aside className="combat-tools-card">
          <details className="tool-card">
            <summary>Nouveau combat</summary>

            <form className="encounter-form" onSubmit={onCreateEncounter}>
              <label>
                Nom
                <input name="name" minLength={2} maxLength={120} placeholder="Embuscade gobeline" required />
              </label>

              <button className="ghost-button" disabled={isBusy} type="submit">
                Creer combat
              </button>
            </form>
          </details>

          <details className="tool-card" open>
            <summary>Ajouter un combattant</summary>

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
          </details>
        </aside>
      </div>
    </div>
  );
}
