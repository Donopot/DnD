import { Clock, Plus, SkipForward, Timer, Trash2, Users } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import type { Combatant, Encounter } from "../api/types";

// ── Constants ──────────────────────────────────────────────────────────────

const DND_CONDITIONS = [
  "Aveuglé", "Charmé", "Assourdi", "Effrayé", "Agrippé",
  "Incapacité", "Invisible", "Paralysé", "Pétrifié", "Empoisonné",
  "À terre", "Entravé", "Étourdi", "Inconscient", "Épuisé",
  "Concentration", "En feu", "Glacé", "Béni", "Maudit",
] as const;

// ── Types ──────────────────────────────────────────────────────────────────

type ConditionEntry = {
  name: string;
  duration: number | null; // null = indefinite
  appliedAt: string; // ISO
};

type ConditionsState = Record<string, ConditionEntry[]>; // combatantId → conditions

type ConditionsPanelProps = {
  campaignId: string;
  token: string;
};

// ── localStorage helpers ───────────────────────────────────────────────────

function getStorageKey(campaignId: string, encounterId: string) {
  return `dnd-conditions:${campaignId}:${encounterId}`;
}

function readConditions(campaignId: string, encounterId: string): ConditionsState {
  if (!campaignId || !encounterId) return {};
  try {
    const raw = window.localStorage.getItem(getStorageKey(campaignId, encounterId));
    return raw ? (JSON.parse(raw) as ConditionsState) : {};
  } catch {
    return {};
  }
}

function writeConditions(campaignId: string, encounterId: string, state: ConditionsState) {
  try {
    window.localStorage.setItem(
      getStorageKey(campaignId, encounterId),
      JSON.stringify(state),
    );
  } catch {
    // silent
  }
}

// ── Component ──────────────────────────────────────────────────────────────

export function ConditionsPanel({ campaignId, token }: ConditionsPanelProps) {
  const [encounters, setEncounters] = useState<Encounter[]>([]);
  const [activeEncounter, setActiveEncounter] = useState<Encounter | null>(null);
  const [combatants, setCombatants] = useState<Combatant[]>([]);
  const [conditions, setConditions] = useState<ConditionsState>({});
  const [addingFor, setAddingFor] = useState<string | null>(null);
  const [newCondition, setNewCondition] = useState("");
  const [newDuration, setNewDuration] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);

  const headers = useMemo(
    () => ({
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    }),
    [token],
  );

  // ── Load encounters ──────────────────────────────────────────────────

  useEffect(() => {
    if (!campaignId) return;
    fetch(`/api/campaigns/${campaignId}/encounters`, { headers })
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data: Encounter[]) => setEncounters(data))
      .catch(() => {});
  }, [campaignId, headers]);

  // ── Load active encounter ────────────────────────────────────────────

  async function loadEncounterDetail(encounterId: string) {
    setBusy(true);
    try {
      const res = await fetch(`/api/encounters/${encounterId}`, { headers });
      if (!res.ok) return;
      const detail = await res.json();
      setActiveEncounter(detail);
      setCombatants((detail.combatants as Combatant[]) ?? []);
      setConditions(readConditions(campaignId, encounterId));
    } catch {
      /* ignore */
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    // Auto-select active encounter
    if (encounters.length === 0) return;
    const active = encounters.find((e) => e.status === "active") ?? encounters[0];
    void loadEncounterDetail(active.id);
  }, [encounters]);

  // ── Persist conditions ────────────────────────────────────────────────

  function persist(next: ConditionsState) {
    setConditions(next);
    if (activeEncounter) {
      writeConditions(campaignId, activeEncounter.id, next);
    }
  }

  // ── Add condition to combatant ───────────────────────────────────────

  function addCondition(combatantId: string) {
    if (!newCondition) return;
    const entry: ConditionEntry = {
      name: newCondition,
      duration: newDuration,
      appliedAt: new Date().toISOString(),
    };
    persist({
      ...conditions,
      [combatantId]: [...(conditions[combatantId] ?? []), entry],
    });
    setNewCondition("");
    setNewDuration(null);
    setAddingFor(null);
  }

  function removeCondition(combatantId: string, index: number) {
    const updated = { ...conditions };
    updated[combatantId] = (updated[combatantId] ?? []).filter((_, i) => i !== index);
    if (updated[combatantId].length === 0) delete updated[combatantId];
    persist(updated);
  }

  // ── Advance turn ─────────────────────────────────────────────────────

  function advanceTurn() {
    const next: ConditionsState = {};
    for (const [cid, conds] of Object.entries(conditions)) {
      next[cid] = conds
        .map((c) => {
          if (c.duration === null) return c; // indefinite
          const remaining = c.duration - 1;
          return remaining <= 0 ? null : { ...c, duration: remaining };
        })
        .filter((c): c is ConditionEntry => c !== null);
      if (next[cid].length === 0) delete next[cid];
    }
    persist(next);
  }

  // ── Status helpers ────────────────────────────────────────────────────

  function getConditionStatus(c: ConditionEntry): "warning" | "critical" | "ok" {
    if (c.duration === null) return "ok";
    if (c.duration <= 1) return "critical";
    if (c.duration <= 3) return "warning";
    return "ok";
  }

  // ── Render ───────────────────────────────────────────────────────────

  if (!campaignId) {
    return (
      <div className="gm-panel-content" data-vtt-panel>
        <p className="gm-panel-muted">Sélectionnez une campagne.</p>
      </div>
    );
  }

  const hasConditions = Object.values(conditions).some((c) => c.length > 0);

  return (
    <div className="gm-panel-content conditions-panel" data-vtt-panel>
      {/* ── Header ──────────────────────────────────────────────── */}
      <section className="gm-panel-section">
        <header className="gm-panel-section-header">
          <strong>États & Conditions</strong>
          <small>
            {activeEncounter
              ? `Combat : ${activeEncounter.name}`
              : "Aucun combat actif"}
          </small>
        </header>

        {hasConditions && (
          <div className="gm-panel-actions">
            <button onClick={advanceTurn} type="button" title="Avancer d'un tour (réduit les durées)">
              <SkipForward size={12} /> Tour suivant
            </button>
          </div>
        )}
      </section>

      {/* ── Combatants ───────────────────────────────────────────── */}
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
            {combatants.map((cbt) => {
              const combatantConditions = conditions[cbt.id] ?? [];
              const hasActive = combatantConditions.length > 0;

              return (
                <article
                  className={`gm-panel-card ${hasActive ? "selected" : ""}`}
                  key={cbt.id}
                >
                  <header>
                    <span>
                      <strong>
                        {cbt.is_player_controlled ? "🧑 " : "👹 "}
                        {cbt.name}
                      </strong>
                      <small>
                        {cbt.hp_current !== null && cbt.hp_max !== null
                          ? `PV ${cbt.hp_current}/${cbt.hp_max}`
                          : ""}
                        {cbt.hp_current !== null && cbt.hp_current <= 0 && " · KO"}
                      </small>
                    </span>

                    <button
                      type="button"
                      onClick={() => {
                        setAddingFor(addingFor === cbt.id ? null : cbt.id);
                        setNewCondition("");
                        setNewDuration(null);
                      }}
                      title="Ajouter un état"
                    >
                      <Plus size={12} />
                    </button>
                  </header>

                  {/* Add condition form */}
                  {addingFor === cbt.id && (
                    <div className="conditions-add-form">
                      <select
                        value={newCondition}
                        onChange={(e) => setNewCondition(e.target.value)}
                        aria-label="État à ajouter"
                      >
                        <option value="">Choisir un état...</option>
                        {DND_CONDITIONS.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                      <div className="gm-panel-actions three">
                        <input
                          type="number"
                          value={newDuration ?? ""}
                          onChange={(e) =>
                            setNewDuration(
                              e.target.value ? Number(e.target.value) : null,
                            )
                          }
                          placeholder="Tours"
                          min={1}
                          max={99}
                          aria-label="Durée en tours"
                        />
                        <button
                          onClick={() => addCondition(cbt.id)}
                          disabled={!newCondition}
                          type="button"
                        >
                          Appliquer
                        </button>
                        <button
                          onClick={() => setAddingFor(null)}
                          type="button"
                        >
                          Annuler
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Active conditions */}
                  {combatantConditions.length > 0 && (
                    <div className="conditions-list">
                      {combatantConditions.map((c, i) => {
                        const status = getConditionStatus(c);
                        return (
                          <div
                            className={`conditions-badge ${status}`}
                            key={i}
                            title={
                              c.duration !== null
                                ? `${c.duration} tour(s) restant(s)`
                                : "Durée indéfinie"
                            }
                          >
                            <span>{c.name}</span>
                            <small>
                              {c.duration !== null ? (
                                <>
                                  <Timer size={10} /> {c.duration}t
                                </>
                              ) : (
                                <Clock size={10} />
                              )}
                            </small>
                            <button
                              type="button"
                              className="conditions-remove"
                              onClick={() => removeCondition(cbt.id, i)}
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

      {/* ── Footer ──────────────────────────────────────────────────── */}
      <footer className="gm-panel-footer">
        <span className="gm-panel-muted">
          <Users size={12} /> Les états expirent automatiquement quand vous avancez le tour
        </span>
      </footer>
    </div>
  );
}
