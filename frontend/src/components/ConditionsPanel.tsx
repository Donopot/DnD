import { Clock, Plus, SkipForward, Timer, Trash2, Users } from "lucide-react";
import { useEffect, useState } from "react";

import { apiRequest } from "../api/client";
import type { Combatant, Encounter } from "../api/types";

const DND_CONDITIONS = [
  "Aveuglé",
  "Charmé",
  "Assourdi",
  "Effrayé",
  "Agrippé",
  "Incapacité",
  "Invisible",
  "Paralysé",
  "Pétrifié",
  "Empoisonné",
  "À terre",
  "Entravé",
  "Étourdi",
  "Inconscient",
  "Épuisé",
  "Concentration",
  "En feu",
  "Glacé",
  "Béni",
  "Maudit",
] as const;

type ConditionEntry = {
  name: string;
  duration: number | null;
  duration_unit: "rounds" | "minutes" | "hours" | null;
  source: string | null;
  is_concentration: boolean;
};

type ConditionsPanelProps = {
  campaignId: string;
  token: string;
};

function normalizeCondition(condition: unknown): ConditionEntry {
  if (typeof condition === "string") {
    return {
      name: condition,
      duration: null,
      duration_unit: null,
      source: null,
      is_concentration: false,
    };
  }

  if (condition && typeof condition === "object") {
    const raw = condition as Partial<ConditionEntry>;
    return {
      name: typeof raw.name === "string" ? raw.name : "",
      duration: typeof raw.duration === "number" ? raw.duration : null,
      duration_unit: raw.duration_unit ?? null,
      source: raw.source ?? null,
      is_concentration: Boolean(raw.is_concentration),
    };
  }

  return {
    name: "",
    duration: null,
    duration_unit: null,
    source: null,
    is_concentration: false,
  };
}

function serializeCondition(condition: ConditionEntry): ConditionEntry {
  return {
    name: condition.name,
    duration: condition.duration,
    duration_unit: condition.duration === null ? null : (condition.duration_unit ?? "rounds"),
    source: condition.source ?? null,
    is_concentration: condition.is_concentration,
  };
}

function getCombatantConditions(combatant: Combatant): ConditionEntry[] {
  return ((combatant.conditions ?? []) as unknown[])
    .map(normalizeCondition)
    .filter((condition) => condition.name.length > 0);
}

export function ConditionsPanel({ campaignId, token }: ConditionsPanelProps) {
  const [encounters, setEncounters] = useState<Encounter[]>([]);
  const [activeEncounter, setActiveEncounter] = useState<Encounter | null>(null);
  const [combatants, setCombatants] = useState<Combatant[]>([]);
  const [addingFor, setAddingFor] = useState<string | null>(null);
  const [newCondition, setNewCondition] = useState("");
  const [newDuration, setNewDuration] = useState<number | null>(null);

  function resetPanelState() {
    setEncounters([]);
    setActiveEncounter(null);
    setCombatants([]);
    setAddingFor(null);
    setNewCondition("");
    setNewDuration(null);
  }

  useEffect(() => {
    resetPanelState();

    if (!campaignId) return;

    let cancelled = false;
    apiRequest<Encounter[]>(`/api/campaigns/${campaignId}/encounters`, token)
      .then((data) => {
        if (cancelled) return;
        setEncounters(data);
        if (data.length === 0) {
          setActiveEncounter(null);
          setCombatants([]);
          setAddingFor(null);
          setNewCondition("");
          setNewDuration(null);
        }
      })
      .catch(() => {
        if (!cancelled) resetPanelState();
      });

    return () => {
      cancelled = true;
    };
  }, [campaignId, token]);

  async function loadEncounterDetail(encounterId: string) {
    try {
      const detail = await apiRequest<Encounter & { combatants?: Combatant[] }>(
        `/api/encounters/${encounterId}`,
        token,
      );
      setActiveEncounter(detail);
      setCombatants(detail.combatants ?? []);
      setAddingFor(null);
      setNewCondition("");
      setNewDuration(null);
    } catch {
      /* ignore */
    }
  }

  useEffect(() => {
    if (encounters.length === 0) {
      setActiveEncounter(null);
      setCombatants([]);
      setAddingFor(null);
      setNewCondition("");
      setNewDuration(null);
      return;
    }

    const active = encounters.find((e) => e.status === "active") ?? encounters[0];
    void loadEncounterDetail(active.id);
  }, [encounters]);

  function updateCombatant(updated: Combatant) {
    setCombatants((current) =>
      current.map((combatant) => (combatant.id === updated.id ? updated : combatant)),
    );
  }

  async function addCondition(combatantId: string) {
    if (!activeEncounter || !newCondition) return;

    try {
      const updated = await apiRequest<Combatant>(
        `/api/encounters/${activeEncounter.id}/conditions/apply`,
        token,
        {
          method: "POST",
          body: JSON.stringify({
            combatant_id: combatantId,
            condition: {
              name: newCondition,
              duration: newDuration,
              duration_unit: newDuration === null ? null : "rounds",
              source: null,
              is_concentration: newCondition === "Concentration",
            },
          }),
        },
      );

      updateCombatant(updated);
      setNewCondition("");
      setNewDuration(null);
      setAddingFor(null);
    } catch {
      // apiRequest handles error display
    }
  }

  async function removeCondition(combatantId: string, conditionName: string) {
    if (!activeEncounter) return;

    try {
      const updated = await apiRequest<Combatant>(
        `/api/encounters/${activeEncounter.id}/conditions/remove`,
        token,
        {
          method: "POST",
          body: JSON.stringify({
            combatant_id: combatantId,
            condition_name: conditionName,
          }),
        },
      );

      updateCombatant(updated);
    } catch {
      // apiRequest handles error display
    }
  }

  async function saveCombatantConditions(combatantId: string, nextConditions: ConditionEntry[]) {
    try {
      const updated = await apiRequest<Combatant>(`/api/combatants/${combatantId}`, token, {
        method: "PATCH",
        body: JSON.stringify({
          conditions: nextConditions.map(serializeCondition),
        }),
      });

      updateCombatant(updated);
    } catch {
      // apiRequest handles error display
    }
  }

  async function advanceTurn() {
    await Promise.all(
      combatants.map(async (combatant) => {
        const current = getCombatantConditions(combatant);
        const next = current
          .map((condition) => {
            if (condition.duration === null) return condition;
            const remaining = condition.duration - 1;
            return remaining <= 0 ? null : { ...condition, duration: remaining };
          })
          .filter((condition): condition is ConditionEntry => condition !== null);

        if (JSON.stringify(current) !== JSON.stringify(next)) {
          await saveCombatantConditions(combatant.id, next);
        }
      }),
    );
  }

  function getConditionStatus(condition: ConditionEntry): "warning" | "critical" | "ok" {
    if (condition.duration === null) return "ok";
    if (condition.duration <= 1) return "critical";
    if (condition.duration <= 3) return "warning";
    return "ok";
  }

  if (!campaignId) {
    return (
      <div className="gm-panel-content" data-vtt-panel>
        <p className="gm-panel-muted">Sélectionnez une campagne.</p>
      </div>
    );
  }

  const hasConditions = combatants.some(
    (combatant) => getCombatantConditions(combatant).length > 0,
  );

  return (
    <div className="gm-panel-content conditions-panel" data-vtt-panel>
      <section className="gm-panel-section">
        <header className="gm-panel-section-header">
          <strong>États & Conditions</strong>
          <small>
            {activeEncounter ? `Combat : ${activeEncounter.name}` : "Aucun combat actif"}
          </small>
        </header>

        {hasConditions && (
          <div className="gm-panel-actions">
            <button onClick={() => void advanceTurn()} type="button" title="Avancer d'un tour">
              <SkipForward size={12} /> Tour suivant
            </button>
          </div>
        )}
      </section>

      <section className="gm-panel-section">
        <header className="gm-panel-section-header">
          <strong>Combattants</strong>
          <small>{combatants.length} actif(s)</small>
        </header>

        {combatants.length === 0 ? (
          <p className="gm-panel-muted">
            Aucun combattant. Ouvrez un combat dans le panneau Combat.
          </p>
        ) : (
          <div className="gm-panel-list">
            {combatants.map((combatant) => {
              const combatantConditions = getCombatantConditions(combatant);
              const hasActive = combatantConditions.length > 0;

              return (
                <article
                  className={`gm-panel-card ${hasActive ? "selected" : ""}`}
                  key={combatant.id}
                >
                  <header>
                    <span>
                      <strong>
                        {combatant.is_player_controlled ? "🧑 " : "👹 "}
                        {combatant.name}
                      </strong>
                      <small>
                        {combatant.hp_current !== null && combatant.hp_max !== null
                          ? `PV ${combatant.hp_current}/${combatant.hp_max}`
                          : ""}
                        {combatant.hp_current !== null && combatant.hp_current <= 0 && " · KO"}
                      </small>
                    </span>

                    <button
                      type="button"
                      onClick={() => {
                        setAddingFor(addingFor === combatant.id ? null : combatant.id);
                        setNewCondition("");
                        setNewDuration(null);
                      }}
                      title="Ajouter un état"
                    >
                      <Plus size={12} />
                    </button>
                  </header>

                  {addingFor === combatant.id && (
                    <div className="conditions-add-form">
                      <select
                        value={newCondition}
                        onChange={(e) => setNewCondition(e.target.value)}
                        aria-label="État à ajouter"
                      >
                        <option value="">Choisir un état...</option>
                        {DND_CONDITIONS.map((condition) => (
                          <option key={condition} value={condition}>
                            {condition}
                          </option>
                        ))}
                      </select>
                      <div className="gm-panel-actions three">
                        <input
                          type="number"
                          value={newDuration ?? ""}
                          onChange={(e) =>
                            setNewDuration(e.target.value ? Number(e.target.value) : null)
                          }
                          placeholder="Tours"
                          min={1}
                          max={99}
                          aria-label="Durée en tours"
                        />
                        <button
                          onClick={() => void addCondition(combatant.id)}
                          disabled={!newCondition}
                          type="button"
                        >
                          Appliquer
                        </button>
                        <button onClick={() => setAddingFor(null)} type="button">
                          Annuler
                        </button>
                      </div>
                    </div>
                  )}

                  {combatantConditions.length > 0 && (
                    <div className="conditions-list">
                      {combatantConditions.map((condition, index) => {
                        const status = getConditionStatus(condition);
                        return (
                          <div
                            className={`conditions-badge ${status}`}
                            key={`${condition.name}-${index}`}
                            title={
                              condition.duration !== null
                                ? `${condition.duration} tour(s) restant(s)`
                                : "Durée indéfinie"
                            }
                          >
                            <span>{condition.name}</span>
                            <small>
                              {condition.duration !== null ? (
                                <>
                                  <Timer size={10} /> {condition.duration}t
                                </>
                              ) : (
                                <Clock size={10} />
                              )}
                            </small>
                            <button
                              type="button"
                              className="conditions-remove"
                              onClick={() => void removeCondition(combatant.id, condition.name)}
                              title="Retirer cet état"
                            >
                              <Trash2 size={10} />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>

      <footer className="gm-panel-footer">
        <span className="gm-panel-muted">
          <Users size={12} /> Les états expirent automatiquement quand vous avancez le tour
        </span>
      </footer>
    </div>
  );
}
