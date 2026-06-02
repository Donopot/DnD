import { useEffect, useMemo, useState } from "react";

import type { Scene, SceneToken } from "../api/types";

type GmNotesPanelProps = {
  campaignId: string;
  selectedScene: Scene | undefined;
  selectedToken: SceneToken | undefined;
};

function getNotesKey(campaignId: string, sceneId: string) {
  return `dnd-gm-notes:${campaignId || "no-campaign"}:${sceneId || "no-scene"}`;
}

function readStoredNotes(campaignId: string, sceneId: string) {
  try {
    return window.localStorage.getItem(getNotesKey(campaignId, sceneId)) ?? "";
  } catch {
    return "";
  }
}

export function GmNotesPanel({ campaignId, selectedScene, selectedToken }: GmNotesPanelProps) {
  const sceneId = selectedScene?.id ?? "";
  const [notes, setNotes] = useState(() => readStoredNotes(campaignId, sceneId));
  const [savedAt, setSavedAt] = useState("");

  const notesKey = useMemo(() => getNotesKey(campaignId, sceneId), [campaignId, sceneId]);

  useEffect(() => {
    setNotes(readStoredNotes(campaignId, sceneId));
    setSavedAt("");
  }, [campaignId, sceneId]);

  useEffect(() => {
    try {
      window.localStorage.setItem(notesKey, notes);
      setSavedAt(notes ? new Date().toLocaleTimeString() : "");
    } catch {
      setSavedAt("Sauvegarde impossible");
    }
  }, [notes, notesKey]);

  function clearNotes() {
    setNotes("");
  }

  async function copyNotes() {
    try {
      await navigator.clipboard?.writeText(notes);
      setSavedAt("Copié");
    } catch {
      setSavedAt("Copie impossible");
    }
  }

  return (
    <div className="gm-panel-content gm-notes-panel">
      <section className="gm-panel-context">
        <span className="gm-panel-stat">
          <small>Scène</small>
          <strong>{selectedScene?.name ?? "Aucune scène"}</strong>
        </span>

        <span className="gm-panel-stat">
          <small>Token</small>
          <strong>{selectedToken?.name ?? "Aucun token"}</strong>
        </span>
      </section>

      <section className="gm-panel-section">
        <header>
          <strong>Notes privées</strong>
          <small>Local navigateur</small>
        </header>

        <textarea
          aria-label="Notes privées du MJ"
          onChange={(event) => setNotes(event.target.value)}
          placeholder="Notes privées du MJ pour cette scène : indices, pièges, secrets, rappels, improvisation..."
          value={notes}
        />
      </section>

      <footer className="gm-panel-footer">
        <span className="gm-panel-muted">
          {notes.length} caractère(s)
          {savedAt ? ` · ${savedAt}` : ""}
        </span>

        <div className="gm-panel-actions">
          <button disabled={!notes} onClick={copyNotes} type="button">
            Copier
          </button>

          <button disabled={!notes} onClick={clearNotes} type="button">
            Vider
          </button>
        </div>
      </footer>

      <p className="gm-panel-muted">
        Version locale : ces notes sont privées dans ce navigateur. Une sauvegarde backend pourra être ajoutée plus tard.
      </p>
    </div>
  );
}
