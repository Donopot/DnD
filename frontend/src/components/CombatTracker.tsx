import { Play, SkipBack, SkipForward, Swords, Zap } from "lucide-react";
import { useEffect, useState } from "react";

import { apiRequest } from "../api/client";
import type { Combatant, CombatantCondition, Encounter } from "../api/types";

type CombatTrackerProps = {
  campaignId: string;
  token: string;
  onEncounterChange?: () => void;
};

function conditionLabel(condition: CombatantCondition): string {
  return typeof condition === "string" ? condition : condition.name;
}

export function CombatTracker({ campaignId, token, onEncounterChange }: CombatTrackerProps) {
  const [encounters, setEncounters] = useState<Encounter[]>([]);
  const [activeEncounter, setActiveEncounter] = useState<Encounter | null>(null);
  const [combatants, setCombatants] = useState<Combatant[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  // Load encounters
  async function loadEncounters() {
    try {
      const data = await apiRequest<Encounter[]>(`/api/campaigns/${campaignId}/encounters`, token);
      setEncounters(data);
    } catch {
      /* ignore */
    }
  }

  useEffect(() => {
    void loadEncounters();
  }, [campaignId]);

  // Load encounter detail
  async function loadEncounterDetail(encounterId: string) {
    setBusy(true);
    try {
      const data = await apiRequest<Encounter & { combatants?: Combatant[] }>(`/api/encounters/${encounterId}`, token);
      setActiveEncounter(data);
      setCombatants(data.combatants || []);
    } catch {
      /* ignore */
    }
    setBusy(false);
  }

  async function apiPost<T>(path: string, body?: unknown): Promise<T | null> {
    setBusy(true);
    setMessage("");
    try {
      const data = await apiRequest<T>(`/api${path}`, token, {
        method: "POST",
        body: body ? JSON.stringify(body) : undefined,
      });
      onEncounterChange?.();
      return data;
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Erreur");
      return null;
    } finally {
      setBusy(false);
    }
  }

  async function handleStart(eid: string) {
    const detail = await apiPost<{ combatants: Combatant[] }>(`/encounters/${eid}/start`);
    if (detail) {
      setCombatants(detail.combatants);
      setActiveEncounter((prev) =>
        prev ? { ...prev, status: "active", round_number: 1, turn_index: 0 } : prev,
      );
    }
  }

  async function handleNextTurn() {
    if (!activeEncounter) return;
    const detail = await apiPost<{
      combatants: Combatant[];
      turn_index: number;
      round_number: number;
    }>(`/encounters/${activeEncounter.id}/next-turn`);
    if (detail) {
      setCombatants(detail.combatants);
      setActiveEncounter((prev) =>
        prev ? { ...prev, turn_index: detail.turn_index, round_number: detail.round_number } : prev,
      );
    }
  }

  async function handlePrevTurn() {
    if (!activeEncounter) return;
    const detail = await apiPost<{
      combatants: Combatant[];
      turn_index: number;
      round_number: number;
    }>(`/encounters/${activeEncounter.id}/prev-turn`);
    if (detail) {
      setCombatants(detail.combatants);
      setActiveEncounter((prev) =>
        prev ? { ...prev, turn_index: detail.turn_index, round_number: detail.round_number } : prev,
      );
    }
  }

  async function handleEnd(eid: string) {
    await apiPost(`/encounters/${eid}/end`);
    setActiveEncounter((prev) => (prev ? { ...prev, status: "ended" } : prev));
  }

  async function handleQuickDamage(cb: Combatant, amount: number) {
    const updated = await apiPost<Combatant>(`/combatants/${cb.id}/quick-damage`, {
      combatant_id: cb.id,
      amount,
    });
    if (updated) {
      setCombatants((prev) => prev.map((c) => (c.id === cb.id ? updated : c)));
    }
  }

  async function handleToggleDefeated(cb: Combatant) {
    const updated = await apiPost<Combatant>(`/combatants/${cb.id}/quick-damage`, {
      combatant_id: cb.id,
      amount: cb.is_defeated ? 1 : -(cb.hp_current ?? 0) - 1, // revive to 1 HP or kill
    });
    if (updated) {
      setCombatants((prev) => prev.map((c) => (c.id === cb.id ? updated : c)));
    }
  }

  async function handleRollInitiative(eid: string) {
    const detail = await apiPost<{ combatants: Combatant[] }>(`/encounters/${eid}/roll-initiative`);
    if (detail) setCombatants(detail.combatants);
  }

  // Compute active combatant ID
  const activeDefeated = combatants.filter((c) => !c.is_defeated);
  const activeIndex = activeEncounter?.turn_index ?? 0;
  const activeCombatantId =
    activeDefeated[activeIndex % Math.max(1, activeDefeated.length)]?.id ?? null;

  // Sort combatants by initiative desc
  const sorted = [...combatants].sort((a, b) => b.initiative - a.initiative);

  return (
    <div className="combat-tracker">
      {/* Encounter selector */}
      {encounters.length > 0 && (
        <select
          className="combat-select"
          value={activeEncounter?.id ?? ""}
          onChange={(e) => {
            if (e.target.value) loadEncounterDetail(e.target.value);
            else {
              setActiveEncounter(null);
              setCombatants([]);
            }
          }}
        >
          <option value="">— Sélectionner un combat —</option>
          {encounters.map((enc) => (
            <option key={enc.id} value={enc.id}>
              {enc.status === "active" ? "⚔️" : enc.status === "ended" ? "✅" : "📋"} {enc.name}
            </option>
          ))}
        </select>
      )}

      {message && <p className="combat-message">{message}</p>}

      {activeEncounter && (
        <>
          {/* Status bar */}
          <div className="combat-header">
            <div className="combat-round">
              <Swords size={14} />
              <span>Round {activeEncounter.round_number}</span>
            </div>
            <div className="combat-actions">
              {activeEncounter.status === "draft" && (
                <>
                  <button
                    onClick={() => handleRollInitiative(activeEncounter.id)}
                    disabled={busy}
                    className="combat-btn"
                    type="button"
                  >
                    <Zap size={12} /> Initiative
                  </button>
                  <button
                    onClick={() => handleStart(activeEncounter.id)}
                    disabled={busy || combatants.length === 0}
                    className="combat-btn primary"
                    type="button"
                  >
                    <Play size={12} /> Démarrer
                  </button>
                </>
              )}
              {activeEncounter.status === "active" && (
                <>
                  <button
                    onClick={handlePrevTurn}
                    disabled={busy}
                    className="combat-btn"
                    type="button"
                  >
                    <SkipBack size={12} />
                  </button>
                  <button
                    onClick={handleNextTurn}
                    disabled={busy}
                    className="combat-btn primary"
                    type="button"
                  >
                    <SkipForward size={12} /> Tour suivant
                  </button>
                  <button
                    onClick={() => handleEnd(activeEncounter.id)}
                    disabled={busy}
                    className="combat-btn danger"
                    type="button"
                  >
                    Terminer
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Initiative list */}
          <div className="combat-list">
            {sorted.map((cb) => {
              const isActive = cb.id === activeCombatantId && activeEncounter.status === "active";
              const hpPct =
                (cb.hp_max ?? 0) > 0
                  ? Math.round(((cb.hp_current ?? 0) / (cb.hp_max ?? 1)) * 100)
                  : 100;
              const conds = cb.conditions ?? [];

              return (
                <div
                  key={cb.id}
                  className={`combatant-row ${isActive ? "active" : ""} ${cb.is_defeated ? "defeated" : ""}`}
                >
                  {/* Initiative number */}
                  <span className="combatant-init">{cb.initiative}</span>

                  {/* Name + type */}
                  <div className="combatant-info">
                    <span className="combatant-name">{cb.name}</span>
                    <span className="combatant-meta">
                      CA {cb.armor_class}
                      {cb.is_player_controlled ? " 👤" : " 👹"}
                    </span>
                  </div>

                  {/* HP bar */}
                  <div className="combatant-hp">
                    <div className="combatant-hp-bar">
                      <span
                        className={`combatant-hp-fill ${hpPct > 50 ? "good" : hpPct > 25 ? "warn" : "crit"}`}
                        style={{ width: `${Math.max(0, Math.min(100, hpPct))}%` }}
                      />
                    </div>
                    <span className="combatant-hp-text">
                      {cb.hp_current}/{cb.hp_max}
                    </span>
                  </div>

                  {/* Quick damage buttons */}
                  {activeEncounter.status === "active" && (
                    <div className="combatant-dmg-btns">
                      <button
                        onClick={() => handleQuickDamage(cb, -1)}
                        disabled={busy}
                        className="dmg-btn sm"
                        type="button"
                      >
                        -1
                      </button>
                      <button
                        onClick={() => handleQuickDamage(cb, -5)}
                        disabled={busy}
                        className="dmg-btn"
                        type="button"
                      >
                        -5
                      </button>
                      <button
                        onClick={() => handleQuickDamage(cb, 5)}
                        disabled={busy}
                        className="heal-btn"
                        type="button"
                      >
                        +5
                      </button>
                      <button
                        onClick={() => handleToggleDefeated(cb)}
                        disabled={busy}
                        className={`dmg-btn ${cb.is_defeated ? "revive" : ""}`}
                        type="button"
                      >
                        {cb.is_defeated ? "💀 Revivre" : "💀"}
                      </button>
                    </div>
                  )}

                  {/* Conditions */}
                  {conds.length > 0 && (
                    <div className="combatant-conditions">
                      {conds.map((c, i) => (
                        <span key={i} className="cond-tag">
                          {conditionLabel(c)}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {combatants.length === 0 && (
            <p className="muted" style={{ textAlign: "center", padding: "1rem" }}>
              Aucun combattant. Ajoutez des tokens à la scène, puis créez un combat.
            </p>
          )}
        </>
      )}

      {encounters.length === 0 && (
        <p className="muted" style={{ textAlign: "center" }}>
          Aucun combat créé.
        </p>
      )}
    </div>
  );
}
