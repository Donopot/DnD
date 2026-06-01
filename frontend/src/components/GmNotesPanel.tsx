import { useEffect, useRef, useState } from "react";
import { Copy, Trash2 } from "lucide-react";
import type { Scene, SceneToken } from "../api/types";

type GmNote = {
  id: string;
  campaign_id: string;
  scene_id: string | null;
  token_id: string | null;
  author_user_id: string | null;
  title: string;
  content: string;
  visibility: string;
  version: number;
  created_at: string;
  updated_at: string;
};

type GmNotesPanelProps = {
  campaignId: string;
  token: string;
  selectedScene: Scene | undefined;
  selectedToken: SceneToken | undefined;
};

export function GmNotesPanel({ campaignId, token, selectedScene, selectedToken }: GmNotesPanelProps) {
  const sceneId = selectedScene?.id ?? "";
  const [notes, setNotes] = useState<GmNote[]>([]);
  const [content, setContent] = useState("");
  const [noteId, setNoteId] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState("");
  const [isBusy, setIsBusy] = useState(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Load notes for this scene ──────────────────────────────────────────
  async function loadNotes() {
    if (!campaignId || !sceneId) return;
    try {
      // Fetch scene-specific note (or create if not exists)
      const res = await fetch(`/api/campaigns/${campaignId}/gm-notes`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Erreur chargement");
      const all: GmNote[] = await res.json();
      const sceneNote = all.find((n) => n.scene_id === sceneId);
      if (sceneNote) {
        setNoteId(sceneNote.id);
        setContent(sceneNote.content || "");
      } else {
        setNoteId(null);
        setContent("");
      }
    } catch {
      // silently
    }
  }

  useEffect(() => {
    void loadNotes();
  }, [campaignId, sceneId]);

  // ── Auto-save with debounce ────────────────────────────────────────────
  async function save(contentToSave: string) {
    if (!campaignId){
      return;
    }
    setIsBusy(true);
    try {
      if (noteId) {
        // Update existing
        await fetch(`/api/gm-notes/${noteId}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            scene_id: sceneId,
            content: contentToSave,
          }),
        });
      } else {
        // Create new
        const res = await fetch(`/api/campaigns/${campaignId}/gm-notes`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            scene_id: sceneId,
            token_id: selectedToken?.id ?? null,
            title: selectedScene?.name ?? "Scene",
            content: contentToSave,
            visibility: "gm_team",
          }),
        });
        if (res.ok) {
          const created: GmNote = await res.json();
          setNoteId(created.id);
        }
      }
      setSavedAt(new Date().toLocaleTimeString());
    } catch {
      setSavedAt("⚠️ Erreur sauvegarde");
    } finally {
      setIsBusy(false);
    }
  }

  function handleContentChange(newContent: string) {
    setContent(newContent);
    // Debounce save by 1.5s
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      void save(newContent);
    }, 1500);
  }

  // Cleanup timer on unmount + save any pending changes
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
        // Save immediately on unmount if changed
        if (content) void save(content);
      }
    };
  }, [content]);

  // ── Copy ───────────────────────────────────────────────────────────────
  async function copyNotes() {
    try {
      await navigator.clipboard?.writeText(content);
      setSavedAt("Copié !");
    } catch {
      setSavedAt("Copie impossible");
    }
  }

  // ── Clear ──────────────────────────────────────────────────────────────
  async function clearNotes() {
    setContent("");
    if (noteId) {
      try {
        await fetch(`/api/gm-notes/${noteId}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        });
        setNoteId(null);
      } catch {
        // ignore
      }
    }
    setSavedAt("Vidé");
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
          <strong>Notes MJ</strong>
          <small>{isBusy ? "⏳ Sauvegarde..." : savedAt ? `✓ ${savedAt}` : "✏ En attente"}</small>
        </header>
        <textarea
          aria-label="Notes privées du MJ"
          onChange={(event) => handleContentChange(event.target.value)}
          placeholder="Notes pour cette scène : indices, pièges, secrets, rappels..."
          value={content}
        />
      </section>

      <footer className="gm-panel-footer">
        <span className="gm-panel-muted">
          {content.length} caractère(s)
          {savedAt ? ` · ${savedAt}` : ""}
        </span>
        <div className="gm-panel-actions">
          <button disabled={!content} onClick={copyNotes} type="button">
            <Copy size={14} aria-hidden="true" /> Copier
          </button>
          <button disabled={!content} onClick={clearNotes} type="button">
            <Trash2 size={14} aria-hidden="true" /> Vider
          </button>
        </div>
      </footer>
    </div>
  );
}
