import { Eye, EyeOff, Swords, Target, Trophy } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { apiRequest } from "../api/client";
import type { Combatant, Encounter } from "../api/types";

// ── Types ──────────────────────────────────────────────────────────────────

type EncounterNotes = {
  objectives: string;
  victoryConditions: string;
  loot: string;
};

const EMPTY_NOTES: EncounterNotes = { objectives: "", victoryConditions: "", loot: "" };

type ActiveEncounterPanelProps = {
  campaignId: string;
  token: string;
};

// ── localStorage helpers ───────────────────────────────────────────────────

function getNotesKey(campaignId: string, encounterId: string) {
  return `dnd-encounter-notes:${campaignId}:${encounterId}`;
}

function readNotes(campaignId: string, encounterId: string): EncounterNotes {
  if (!campaignId || !encounterId) return EMPTY_NOTES;
  try {
    const raw = window.localStorage.getItem(getNotesKey(campaignId, encounterId));
    return raw ? (JSON.parse(raw) as EncounterNotes) : EMPTY_NOTES;
  } catch {
    return EMPTY_NOTES;
  }
}

function writeNotes(campaignId: string, encounterId: string, notes: EncounterNotes) {
  try {
    window.localStorage.setItem(getNotesKey(campaignId, encounterId), JSON.stringify(notes));
  } catch {
    // silent
  }
}

// ── Component ──────────────────────────────────────────────────────────────

export function ActiveEncounterPanel({ campaignId, token }: ActiveEncounterPanelProps) {
  const [encounters, setEncounters] = useState<Encounter[]>([]);
  const [activeEncounter, setActiveEncounter] = useState<Encounter | null>(null);
  const [combatants, setCombatants] = useState<Combatant[]>([]);
  const [notes, setNotes] = useState<EncounterNotes>(EMPTY_NOTES);
  const [editing, setEditing] = useState<string | null>(null); // field being edited
  const [draftValue, setDraftValue] = useState("");
  const detailRequestIdRef = useRef(0);
  const latestCampaignIdRef = useRef(campaignId);
  const latestTokenRef = useRef(token);

  latestCampaignIdRef.current = campaignId;
  latestTokenRef.current = token;

  const resetEncounterDetailState = useCallback(() => {
    setActiveEncounter(null);
    setCombatants([]);
    setNotes(EMPTY_NOTES);
    setEditing(null);
    setDraftValue("");
  }, []);

  const resetEncounterState = useCallback(() => {
    setEncounters([]);
    resetEncounterDetailState();
  }, [resetEncounterDetailState]);

  // ── Load encounters ──────────────────────────────────────────────────

  useEffect(() => {
    detailRequestIdRef.current += 1;
    resetEncounterState();

    if (!campaignId) return;

    let cancelled = false;
    apiRequest<Encounter[]>(`/api/campaigns/${campaignId}/encounters`, token)
      .then((data) => {
        if (cancelled) return;
        setEncounters(data);
        if (data.length === 0) {
          resetEncounterDetailState();
        }
      })
      .catch(() => {
        if (cancelled) return;
        resetEncounterDetailState();
      });

    return () => {
      cancelled = true;
      detailRequestIdRef.current += 1;
    };
  }, [campaignId, token, resetEncounterDetailState, resetEncounterState]);

  // ── Load active encounter detail ─────────────────────────────────────

  const loadEncounterDetail = useCallback(async (encounterId: string) => {
    const requestId = detailRequestIdRef.current + 1;
    detailRequestIdRef.current = requestId;
    const requestCampaignId = latestCampaignIdRef.current;
    const requestToken = latestTokenRef.current;

    try {
      const detail = await apiRequest<Encounter & { combatants?: Combatant[] }>(`/api/encounters/${encounterId}`, requestToken);

      if (
        requestId !== detailRequestIdRef.current ||
        requestCampaignId !== latestCampaignIdRef.current ||
        requestToken !== latestTokenRef.current
      ) {
        return;
      }

      setActiveEncounter(detail);
      setCombatants((detail.combatants as Combatant[]) ?? []);
      setNotes(readNotes(requestCampaignId, encounterId));
      setEditing(null);
      setDraftValue("");
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (encounters.length === 0) {
      resetEncounterDetailState();
      return;
    }
    const active = encounters.find((e) => e.status === "active") ?? encounters[0];
    void loadEncounterDetail(active.id);
  }, [encounters, loadEncounterDetail, resetEncounterDetailState]);

  // ── Persist notes ─────────────────────────────────────────────────────

  function persistNotes(updated: EncounterNotes) {
    setNotes(updated);
    if (activeEncounter) {
      writeNotes(campaignId, activeEncounter.id, updated);
    }
  }

  function toggleEditing(field: keyof EncounterNotes) {
    if (editing === field) {
      setEditing(null);
      setDraftValue("");
      return;
    }
    setEditing(field);
    setDraftValue(notes[field]);
  }

  function saveField(field: keyof EncounterNotes) {
    persistNotes({ ...notes, [field]: draftValue });
    setEditing(null);
    setDraftValue("");
  }

  // ── Computed ──────────────────────────────────────────────────────────

  const visibleCombatants = useMemo(
    () => combatants.filter((c) => !c.is_hidden && !c.is_defeated),
    [combatants],
  );
  const hiddenCombatants = useMemo(
    () => combatants.filter((c) => c.is_hidden && !c.is_defeated),
    [combatants],
  );
  const defeatedCombatants = useMemo(
    () => combatants.filter((c) => c.is_defeated),
    [combatants],
  );

  const statusLabel = activeEncounter?.status === "active" ? "En cours" :
    activeEncounter?.status === "draft" ? "Préparation" :
      activeEncounter?.status === "ended" ? "Terminé" : "";

  // ── Render ───────────────────────────────────────────────────────────

  if (!campaignId) {
    return (
      <div className="gm-panel-content" data-vtt-panel>
        <p className="gm-panel-muted">Sélectionnez une campagne.</p>
      </div>
    );
  }

  if (!activeEncounter) {
    return (
      <div className="gm-panel-content" data-vtt-panel>
        <p className="gm-panel-muted">
          Aucun combat. Créez un combat dans le panneau Combat.
        </p>
      </div>
    );
  }

  return (
    <div className="gm-panel-content active-encounter-panel" data-vtt-panel>
      {/* ── Header ──────────────────────────────────────────────── */}
      <section className="gm-panel-section">
        <header className="gm-panel-section-header">
          <strong>{activeEncounter.name}</strong>
          <small>Round {activeEncounter.round_number} · {statusLabel}</small>
        </header>

        <div className="gm-panel-actions">
          {encounters
            .filter((e) => e.id !== activeEncounter.id)
            .map((e) => (
              <button
                key={e.id}
                onClick={() => void loadEncounterDetail(e.id)}
                type="button"
                className={e.status === "active" ? "active" : ""}
              >
                <Swords size={12} /> {e.name}
              </button>
            ))}
        </div>
      </section>

      {/* ── Combatant overview ───────────────────────────────────── */}
      <section className="gm-panel-section">
        <header className="gm-panel-section-header">
          <strong>Combattants</strong>
          <small>
            {visibleCombatants.length} visible(s) · {hiddenCombatants.length} caché(s)
            {defeatedCombatants.length > 0 && ` · ${defeatedCombatants.length} vaincu(s)`}
          </small>
        </header>

        {combatants.length === 0 ? (
          <p className="gm-panel-muted">Aucun combattant dans ce combat.</p>
        ) : (
          <div className="gm-panel-list">
            {/* Visible / active combatants */}
            {visibleCombatants.map((c) => (
              <article className="gm-panel-row" key={c.id}>
                <header>
                  <span>
                    <strong>
                      <Eye size={12} /> {c.name}
                    </strong>
                    <small>
                      {c.hp_current !== null && c.hp_max !== null
                        ? `PV ${c.hp_current}/${c.hp_max}`
                        : "PV ?"}
                      {c.armor_class !== null && ` · CA ${c.armor_class}`}
                    </small>
                  </span>
                </header>
              </article>
            ))}

            {/* Hidden combatants */}
            {hiddenCombatants.map((c) => (
              <article className="gm-panel-row danger" key={c.id}>
                <header>
                  <span>
                    <strong>
                      <EyeOff size={12} /> {c.name}
                    </strong>
                    <small>Caché aux joueurs</small>
                  </span>
                </header>
              </article>
            ))}

            {/* Defeated combatants */}
            {defeatedCombatants.map((c) => (
              <article className="gm-panel-row" key={c.id} style={{ opacity: 0.6 }}>
                <header>
                  <span>
                    <strong style={{ textDecoration: "line-through" }}>
                      {c.name}
                    </strong>
                    <small>Vaincu</small>
                  </span>
                </header>
              </article>
            ))}
          </div>
        )}
      </section>

      {/* ── Objectives ────────────────────────────────────────────── */}
      <section className="gm-panel-section">
        <header className="gm-panel-section-header">
          <strong><Target size={12} /> Objectifs</strong>
          <button
            type="button"
            onClick={() => toggleEditing("objectives")}
          >
            {editing === "objectives" ? "Annuler" : notes.objectives ? "Modifier" : "Ajouter"}
          </button>
        </header>

        {editing === "objectives" ? (
          <div className="encounter-notes-form">
            <textarea
              value={draftValue}
              onChange={(e) => setDraftValue(e.target.value)}
              placeholder="Objectifs du combat (visibles par le MJ uniquement)..."
              rows={3}
            />
            <div className="gm-panel-actions">
              <button onClick={() => saveField("objectives")} type="button">
                Enregistrer
              </button>
            </div>
          </div>
        ) : notes.objectives ? (
          <p className="gm-panel-muted" style={{ whiteSpace: "pre-wrap" }}>
            {notes.objectives}
          </p>
        ) : (
          <p className="gm-panel-muted">Aucun objectif défini.</p>
        )}
      </section>

      {/* ── Victory conditions ────────────────────────────────────── */}
      <section className="gm-panel-section">
        <header className="gm-panel-section-header">
          <strong><Trophy size={12} /> Conditions de victoire</strong>
          <button
            type="button"
            onClick={() => toggleEditing("victoryConditions")}
          >
            {editing === "victoryConditions" ? "Annuler" : notes.victoryConditions ? "Modifier" : "Ajouter"}
          </button>
        </header>

        {editing === "victoryConditions" ? (
          <div className="encounter-notes-form">
            <textarea
              value={draftValue}
              onChange={(e) => setDraftValue(e.target.value)}
              placeholder="Conditions de victoire..."
              rows={2}
            />
            <div className="gm-panel-actions">
              <button onClick={() => saveField("victoryConditions")} type="button">
                Enregistrer
              </button>
            </div>
          </div>
        ) : notes.victoryConditions ? (
          <p className="gm-panel-muted" style={{ whiteSpace: "pre-wrap" }}>
            {notes.victoryConditions}
          </p>
        ) : (
          <p className="gm-panel-muted">Aucune condition définie.</p>
        )}
      </section>

      {/* ── Loot ───────────────────────────────────────────────────── */}
      <section className="gm-panel-section">
        <header className="gm-panel-section-header">
          <strong>🏆 Loot</strong>
          <button
            type="button"
            onClick={() => toggleEditing("loot")}
          >
            {editing === "loot" ? "Annuler" : notes.loot ? "Modifier" : "Ajouter"}
          </button>
        </header>

        {editing === "loot" ? (
          <div className="encounter-notes-form">
            <textarea
              value={draftValue}
              onChange={(e) => setDraftValue(e.target.value)}
              placeholder="Butin, trésors, objets magiques..."
              rows={2}
            />
            <div className="gm-panel-actions">
              <button onClick={() => saveField("loot")} type="button">
                Enregistrer
              </button>
            </div>
          </div>
        ) : notes.loot ? (
          <p className="gm-panel-muted" style={{ whiteSpace: "pre-wrap" }}>
            {notes.loot}
          </p>
        ) : (
          <p className="gm-panel-muted">Aucun loot défini.</p>
        )}
      </section>

      {/* ── Footer ─────────────────────────────────────────────────── */}
      <footer className="gm-panel-footer">
        <span className="gm-panel-muted">
          <Swords size={12} /> Notes privées MJ — non visibles par les joueurs
        </span>
      </footer>
    </div>
  );
}
