import { Eye, EyeOff, Swords, Target, Trophy } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import type { Combatant, Encounter } from "../api/types";

// ── Types ──────────────────────────────────────────────────────────────────

type EncounterNotes = {
  objectives: string;
  victoryConditions: string;
  loot: string;
};

type ActiveEncounterPanelProps = {
  campaignId: string;
  token: string;
};

// ── localStorage helpers ───────────────────────────────────────────────────

function getNotesKey(campaignId: string, encounterId: string) {
  return `dnd-encounter-notes:${campaignId}:${encounterId}`;
}

function readNotes(campaignId: string, encounterId: string): EncounterNotes {
  if (!campaignId || !encounterId) return { objectives: "", victoryConditions: "", loot: "" };
  try {
    const raw = window.localStorage.getItem(getNotesKey(campaignId, encounterId));
    return raw ? (JSON.parse(raw) as EncounterNotes) : { objectives: "", victoryConditions: "", loot: "" };
  } catch {
    return { objectives: "", victoryConditions: "", loot: "" };
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
  const [notes, setNotes] = useState<EncounterNotes>({ objectives: "", victoryConditions: "", loot: "" });
  const [editing, setEditing] = useState<string | null>(null); // field being edited

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

  // ── Load active encounter detail ─────────────────────────────────────

  async function loadEncounterDetail(encounterId: string) {
    try {
      const res = await fetch(`/api/encounters/${encounterId}`, { headers });
      if (!res.ok) return;
      const detail = await res.json();
      setActiveEncounter(detail);
      setCombatants((detail.combatants as Combatant[]) ?? []);
      setNotes(readNotes(campaignId, encounterId));
      setEditing(null);
    } catch {
      /* ignore */
    }
  }

  useEffect(() => {
    if (encounters.length === 0) return;
    const active = encounters.find((e) => e.status === "active") ?? encounters[0];
    void loadEncounterDetail(active.id);
  }, [encounters]);

  // ── Persist notes ─────────────────────────────────────────────────────

  function persistNotes(updated: EncounterNotes) {
    setNotes(updated);
    if (activeEncounter) {
      writeNotes(campaignId, activeEncounter.id, updated);
    }
  }

  function saveField(field: keyof EncounterNotes, value: string) {
    persistNotes({ ...notes, [field]: value });
    setEditing(null);
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
    <div className="gm-panel-content" data-vtt-panel>
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
            onClick={() => setEditing(editing === "objectives" ? null : "objectives")}
          >
            {editing === "objectives" ? "Annuler" : notes.objectives ? "Modifier" : "Ajouter"}
          </button>
        </header>

        {editing === "objectives" ? (
          <div className="encounter-notes-form">
            <textarea
              value={notes.objectives}
              onChange={(e) => setNotes({ ...notes, objectives: e.target.value })}
              placeholder="Objectifs du combat (visibles par le MJ uniquement)..."
              rows={3}
            />
            <div className="gm-panel-actions">
              <button onClick={() => saveField("objectives", notes.objectives)} type="button">
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
            onClick={() => setEditing(editing === "victoryConditions" ? null : "victoryConditions")}
          >
            {editing === "victoryConditions" ? "Annuler" : notes.victoryConditions ? "Modifier" : "Ajouter"}
          </button>
        </header>

        {editing === "victoryConditions" ? (
          <div className="encounter-notes-form">
            <textarea
              value={notes.victoryConditions}
              onChange={(e) => setNotes({ ...notes, victoryConditions: e.target.value })}
              placeholder="Conditions de victoire..."
              rows={2}
            />
            <div className="gm-panel-actions">
              <button onClick={() => saveField("victoryConditions", notes.victoryConditions)} type="button">
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
            onClick={() => setEditing(editing === "loot" ? null : "loot")}
          >
            {editing === "loot" ? "Annuler" : notes.loot ? "Modifier" : "Ajouter"}
          </button>
        </header>

        {editing === "loot" ? (
          <div className="encounter-notes-form">
            <textarea
              value={notes.loot}
              onChange={(e) => setNotes({ ...notes, loot: e.target.value })}
              placeholder="Butin, trésors, objets magiques..."
              rows={2}
            />
            <div className="gm-panel-actions">
              <button onClick={() => saveField("loot", notes.loot)} type="button">
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
