import { Play, SkipForward, Square, Swords, Users } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { apiRequest } from "../api/client";
import type { Encounter, EncounterDetail } from "../api/types";

// ── Types ──────────────────────────────────────────────────────────────────

type InitiativePanelProps = {
  campaignId: string;
  token: string;
};

// ── Component ──────────────────────────────────────────────────────────────

export function InitiativePanel({ campaignId, token }: InitiativePanelProps) {
  const [encounters, setEncounters] = useState<Encounter[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [detail, setDetail] = useState<EncounterDetail | null>(null);
  const [busy, setBusy] = useState(false);

  // ── Load encounters ──────────────────────────────────────────────────

  async function loadEncounters() {
    if (!campaignId) return;
    try {
      const data: Encounter[] = await apiRequest(`/api/campaigns/${campaignId}/encounters`, token);
      setEncounters(data);
      const active = data.find((e) => e.status === "active");
      if (active) {
        setSelectedId(active.id);
      } else if (data.length > 0 && !selectedId) {
        setSelectedId(data[0].id);
      }
    } catch {
      /* ignore */
    }
  }

  useEffect(() => {
    void loadEncounters();
  }, [campaignId, token]);

  // ── Load encounter detail ────────────────────────────────────────────

  async function loadDetail(encounterId: string) {
    if (!encounterId) return;
    setBusy(true);
    try {
      const data: EncounterDetail = await apiRequest(`/api/encounters/${encounterId}`, token);
      setDetail(data);
    } catch {
      /* ignore */
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (selectedId) void loadDetail(selectedId);
  }, [selectedId]);

  // ── Actions ───────────────────────────────────────────────────────────

  async function call(endpoint: string, method = "POST") {
    setBusy(true);
    try {
      const data: EncounterDetail = await apiRequest(endpoint, token, { method });
      setDetail(data);
      void loadEncounters();
    } catch {
      /* ignore */
    } finally {
      setBusy(false);
    }
  }

  function startEncounter() { if (selectedId) void call(`/api/encounters/${selectedId}/start`); }
  function nextTurn() { if (selectedId) void call(`/api/encounters/${selectedId}/next-turn`); }
  function endEncounter() { if (selectedId) void call(`/api/encounters/${selectedId}/end`); }

  async function toggleDefeated(combatantId: string, currentDefeated: boolean) {
    try {
      await apiRequest(`/api/combatants/${combatantId}`, token, {
        method: "PATCH",
        body: JSON.stringify({ is_defeated: !currentDefeated }),
      });
      if (selectedId) void loadDetail(selectedId);
    } catch {
      /* ignore */
    }
  }

  // ── Computed ──────────────────────────────────────────────────────────

  const combatants = detail?.combatants ?? [];
  const activeId = detail?.active_combatant_id;
  const isActive = detail?.status === "active";
  const isEnded = detail?.status === "ended";
  const isDraft = detail?.status === "draft";

  const activeCombatants = useMemo(
    () => combatants.filter((c) => !c.is_defeated),
    [combatants],
  );
  const defeatedCombatants = useMemo(
    () => combatants.filter((c) => c.is_defeated),
    [combatants],
  );

  // ── Render ───────────────────────────────────────────────────────────

  if (!campaignId) {
    return (
      <div className="gm-panel-content initiative-panel" data-vtt-panel>
        <p className="gm-panel-muted">Sélectionnez une campagne.</p>
      </div>
    );
  }

  return (
    <div className="gm-panel-content initiative-panel" data-vtt-panel>
      {/* ── Encounter selector ────────────────────────────────────── */}
      <section className="gm-panel-section">
        <header className="gm-panel-section-header">
          <strong><Swords size={12} /> Combat</strong>
        </header>

        {encounters.length === 0 ? (
          <p className="gm-panel-muted">
            Aucun combat. Créez un combat dans le panneau Combat.
          </p>
        ) : (
          <div className="gm-panel-actions">
            {encounters.map((e) => (
              <button
                key={e.id}
                onClick={() => setSelectedId(e.id)}
                type="button"
                className={selectedId === e.id ? "active" : ""}
              >
                {e.status === "active" ? <Play size={12} /> : e.status === "ended" ? <Square size={12} /> : <Users size={12} />}{" "}
                {e.name}
              </button>
            ))}
          </div>
        )}
      </section>

      {/* ── Round & status ────────────────────────────────────────── */}
      {detail && (
        <section className="gm-panel-section">
          <header className="gm-panel-section-header">
            <strong>{detail.name}</strong>
            <small>
              Round {detail.round_number}
              {isActive && ` · Tour ${detail.turn_index + 1}/${activeCombatants.length}`}
              {isDraft && " · Préparation"}
              {isEnded && " · Terminé"}
            </small>
          </header>

          {/* ── Controls ──────────────────────────────────────────── */}
          <div className="gm-panel-actions">
            {isDraft && (
              <button disabled={busy || combatants.length === 0} onClick={startEncounter} type="button">
                <Play size={12} /> Démarrer le combat
              </button>
            )}
            {isActive && (
              <>
                <button disabled={busy} onClick={nextTurn} type="button">
                  <SkipForward size={12} /> Tour suivant
                </button>
                <button disabled={busy} onClick={endEncounter} type="button">
                  <Square size={12} /> Terminer
                </button>
              </>
            )}
            {isEnded && (
              <button disabled={busy} onClick={startEncounter} type="button">
                <Play size={12} /> Reprendre
              </button>
            )}
          </div>
        </section>
      )}

      {/* ── Combatants ─────────────────────────────────────────────── */}
      {combatants.length === 0 ? (
        <p className="gm-panel-muted">
          {detail ? "Aucun combattant dans ce combat." : busy ? "Chargement…" : "Sélectionnez un combat."}
        </p>
      ) : (
        <section className="gm-panel-section">
          <header className="gm-panel-section-header">
            <strong>Combattants</strong>
            <small>{activeCombatants.length} actif(s) · {defeatedCombatants.length} vaincu(s)</small>
          </header>

          <div className="gm-panel-list">
            {/* Active combatants (sorted by initiative) */}
            {activeCombatants.map((c) => {
              const isCurrentTurn = isActive && c.id === activeId;
              return (
                <article
                  className={`gm-panel-row ${isCurrentTurn ? "selected" : ""}`}
                  key={c.id}
                >
                  <span className="initiative-badge">
                    {c.initiative}
                  </span>
                  <span>
                    <strong>{c.name}</strong>
                    <small>
                      {c.hp_current !== null && c.hp_max !== null
                        ? `PV ${c.hp_current}/${c.hp_max}`
                        : ""}
                      {c.armor_class !== null ? ` · CA ${c.armor_class}` : ""}
                      {isCurrentTurn ? " · Tour actif" : ""}
                    </small>
                  </span>
                  {isActive && (
                    <button
                      className="gm-panel-button"
                      onClick={() => void toggleDefeated(c.id, c.is_defeated)}
                      title="Vaincu"
                      type="button"
                    >
                      KO
                    </button>
                  )}
                </article>
              );
            })}

            {/* Defeated combatants */}
            {defeatedCombatants.map((c) => (
              <article
                className="gm-panel-row"
                key={c.id}
                style={{ opacity: 0.55 }}
              >
                <span className="initiative-badge">—</span>
                <span>
                  <strong style={{ textDecoration: "line-through" }}>{c.name}</strong>
                  <small>Vaincu</small>
                </span>
                {isActive && (
                  <button
                    className="gm-panel-button"
                    onClick={() => void toggleDefeated(c.id, c.is_defeated)}
                    title="Ramener au combat"
                    type="button"
                  >
                    ↩
                  </button>
                )}
              </article>
            ))}
          </div>
        </section>
      )}

      {/* ── Footer ─────────────────────────────────────────────────── */}
      {detail && (
        <footer className="gm-panel-footer">
          <span className="gm-panel-muted">
            {isActive ? "Combat en cours" : isEnded ? "Combat terminé" : "Préparation"}
          </span>
        </footer>
      )}
    </div>
  );
}
