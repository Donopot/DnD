import { Crosshair, Dices, Plus, Swords, UserPlus } from "lucide-react";

import type { Combatant, Encounter, Scene } from "../api/types";

type SessionQuickActionsProps = {
  selectedScene: Scene | undefined;
  selectedEncounter: Encounter | undefined;
  combatants: Combatant[];
  isBusy: boolean;
  onNextTurn: () => void;
};

function openQuickPanel(panelName: string) {
  const panel = document.querySelector<HTMLDetailsElement>(`[data-quick-panel="${panelName}"]`);

  if (panel) {
    panel.open = true;
    panel.scrollIntoView({ behavior: "smooth", block: "center" });

    const focusable = panel.querySelector<HTMLElement>("input, select, textarea, button");
    focusable?.focus();
  }
}

function focusMap() {
  const map = document.querySelector<HTMLElement>(".map-scroll");

  if (map) {
    map.scrollIntoView({ behavior: "smooth", block: "center" });
  }
}

export function SessionQuickActions({
  selectedScene,
  selectedEncounter,
  combatants,
  isBusy,
  onNextTurn,
}: SessionQuickActionsProps) {
  const activeCombatant = combatants.find((combatant) => combatant.id === selectedEncounter?.active_combatant_id);

  return (
    <div className="session-quick-actions">
      <div className="quick-context">
        <span>Session MJ</span>
        <strong>{selectedScene?.name ?? "Aucune scene"}</strong>
        <small>
          {selectedEncounter
            ? `${selectedEncounter.name} · round ${selectedEncounter.round_number} · ${activeCombatant?.name ?? "aucun tour actif"}`
            : "Aucun combat actif"}
        </small>
      </div>

      <div className="quick-action-buttons">
        <button className="ghost-button" onClick={focusMap} type="button">
          <Crosshair aria-hidden="true" />
          Carte
        </button>

        <button className="ghost-button" onClick={() => openQuickPanel("token")} type="button">
          <Plus aria-hidden="true" />
          Token
        </button>

        <button className="ghost-button" onClick={() => openQuickPanel("roll")} type="button">
          <Dices aria-hidden="true" />
          De
        </button>

        <button className="ghost-button" onClick={() => openQuickPanel("combatant")} type="button">
          <UserPlus aria-hidden="true" />
          Combattant
        </button>

        <button className="primary-button" disabled={isBusy || !selectedEncounter} onClick={onNextTurn} type="button">
          <Swords aria-hidden="true" />
          Tour suivant
        </button>
      </div>
    </div>
  );
}
