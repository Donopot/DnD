import { useEffect, useMemo, useState } from "react";

import { API_BASE } from "../api/client";
import type { GMNote, Scene, SceneToken } from "../api/types";

type GmNotesPanelProps = {
  authToken: string;
  campaignId: string;
  selectedScene: Scene | undefined;
  selectedToken: SceneToken | undefined;
};

type SyncStatus = "idle" | "loading" | "local" | "saving" | "saved" | "error";

function getNotesKey(campaignId: string, sceneId: string, tokenId: string) {
  return `dnd-gm-notes:${campaignId || "no-campaign"}:${sceneId || "no-scene"}:${tokenId || "no-token"}`;
}

function readStoredNotes(campaignId: string, sceneId: string, tokenId: string) {
  try {
    return window.localStorage.getItem(getNotesKey(campaignId, sceneId, tokenId)) ?? "";
  } catch {
    return "";
  }
}

function writeStoredNotes(campaignId: string, sceneId: string, tokenId: string, notes: string) {
  try {
    window.localStorage.setItem(getNotesKey(campaignId, sceneId, tokenId), notes);
  } catch {
    // Le localStorage peut être indisponible.
  }
}

async function parseError(response: Response) {
  const body = await response.json().catch(() => ({ detail: "Request failed" }));

  if (Array.isArray(body.detail)) {
    return body.detail.map((item: { msg?: string }) => item.msg ?? "Erreur").join(", ");
  }

  return body.detail ?? "Request failed";
}

export function GmNotesPanel({ authToken, campaignId, selectedScene, selectedToken }: GmNotesPanelProps) {
  const sceneId = selectedScene?.id ?? "";
  const tokenId = selectedToken?.id ?? "";
  const [noteId, setNoteId] = useState("");
  const [notes, setNotes] = useState(() => readStoredNotes(campaignId, sceneId, tokenId));
  const [savedAt, setSavedAt] = useState("");
  const [status, setStatus] = useState<SyncStatus>("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const notesKey = useMemo(() => getNotesKey(campaignId, sceneId, tokenId), [campaignId, sceneId, tokenId]);

  useEffect(() => {
    let isCancelled = false;

    async function loadServerNote() {
      setNoteId("");
      setSavedAt("");
      setErrorMessage("");

      const localNotes = readStoredNotes(campaignId, sceneId, tokenId);
      setNotes(localNotes);

      if (!authToken || !campaignId) {
        setStatus("local");
        return;
      }

      setStatus("loading");

      try {
        const params = new URLSearchParams();

        if (sceneId) {
          params.set("scene_id", sceneId);
        }

        if (tokenId) {
          params.set("token_id", tokenId);
        }

        const suffix = params.toString() ? `?${params.toString()}` : "";
        const response = await fetch(`${API_BASE}/api/campaigns/${campaignId}/gm-notes${suffix}`, {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        });

        if (!response.ok) {
          throw new Error(await parseError(response));
        }

        const data = (await response.json()) as GMNote[];

        if (isCancelled) {
          return;
        }

        const exactNote =
          data.find((note) => note.scene_id === (sceneId || null) && note.token_id === (tokenId || null)) ??
          data[0];

        if (exactNote) {
          setNoteId(exactNote.id);
          setNotes(exactNote.content);
          writeStoredNotes(campaignId, sceneId, tokenId, exactNote.content);
          setSavedAt(new Date(exactNote.updated_at).toLocaleTimeString());
          setStatus("saved");
        } else {
          setStatus(localNotes ? "local" : "idle");
        }
      } catch (error) {
        if (!isCancelled) {
          setStatus("local");
          setErrorMessage(error instanceof Error ? error.message : "API Notes MJ indisponible");
        }
      }
    }

    void loadServerNote();

    return () => {
      isCancelled = true;
    };
  }, [authToken, campaignId, sceneId, tokenId, notesKey]);

  useEffect(() => {
    writeStoredNotes(campaignId, sceneId, tokenId, notes);

    if (!authToken || !campaignId) {
      setStatus(notes ? "local" : "idle");
      return;
    }

    if (status === "loading") {
      return;
    }

    const timeout = window.setTimeout(() => {
      void saveServerNote();
    }, 700);

    return () => window.clearTimeout(timeout);
    // notesKey permet de relancer proprement lors d'un changement scène/token.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notes, notesKey, authToken, campaignId]);

  async function saveServerNote() {
    if (!authToken || !campaignId) {
      setStatus(notes ? "local" : "idle");
      return;
    }

    setStatus("saving");
    setErrorMessage("");

    const title = selectedToken?.name
      ? `Note - ${selectedToken.name}`
      : selectedScene?.name
        ? `Note - ${selectedScene.name}`
        : "Note MJ";

    const payload = {
      scene_id: sceneId || null,
      token_id: tokenId || null,
      title,
      content: notes,
      visibility: "gm_team",
    };

    try {
      const response = await fetch(noteId ? `${API_BASE}/api/gm-notes/${noteId}` : `${API_BASE}/api/campaigns/${campaignId}/gm-notes`, {
        method: noteId ? "PATCH" : "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(await parseError(response));
      }

      const saved = (await response.json()) as GMNote;
      setNoteId(saved.id);
      setNotes(saved.content);
      writeStoredNotes(campaignId, sceneId, tokenId, saved.content);
      setSavedAt(new Date(saved.updated_at).toLocaleTimeString());
      setStatus("saved");
    } catch (error) {
      setStatus("local");
      setErrorMessage(error instanceof Error ? error.message : "Sauvegarde serveur impossible");
    }
  }

  async function clearNotes() {
    setNotes("");

    if (!authToken || !noteId) {
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/api/gm-notes/${noteId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          content: "",
        }),
      });

      if (!response.ok) {
        throw new Error(await parseError(response));
      }

      const saved = (await response.json()) as GMNote;
      setSavedAt(new Date(saved.updated_at).toLocaleTimeString());
      setStatus("saved");
    } catch (error) {
      setStatus("local");
      setErrorMessage(error instanceof Error ? error.message : "Vidage serveur impossible");
    }
  }

  async function copyNotes() {
    try {
      await navigator.clipboard?.writeText(notes);
      setSavedAt("Copié");
    } catch {
      setSavedAt("Copie impossible");
    }
  }

  const syncLabel =
    status === "loading"
      ? "Chargement serveur"
      : status === "saving"
        ? "Sauvegarde..."
        : status === "saved"
          ? "Synchronisé serveur"
          : status === "local"
            ? "Local uniquement"
            : "Prêt";

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
          <small>{syncLabel}</small>
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

          <button disabled={!notes} onClick={() => void clearNotes()} type="button">
            Vider
          </button>

          <button disabled={status === "saving"} onClick={() => void saveServerNote()} type="button">
            Sauver
          </button>
        </div>
      </footer>

      {errorMessage ? <p className="gm-panel-muted">Erreur serveur : {errorMessage}</p> : null}

      <p className="gm-panel-muted">
        Les notes sont sauvegardées côté serveur quand l’API est disponible. Une copie locale temporaire est conservée en secours.
      </p>
    </div>
  );
}
