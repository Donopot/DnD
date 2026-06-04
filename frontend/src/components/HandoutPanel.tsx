import { BookOpen, Clock, Eye, EyeOff, Globe, Lock, Plus, Trash2, Users } from "lucide-react";
import { type FormEvent, useContext, useEffect, useMemo, useState } from "react";

import type { Handout, Scene } from "../api/types";
import { WorkspaceStateContext } from "../contexts/WorkspaceStateContext";
import { WorkspaceActionsContext } from "../contexts/WorkspaceActionsContext";
import { PanelContext } from "../contexts/PanelContext";

// ── Reveal history (localStorage) ─────────────────────────────────────────

type RevealEntry = {
  handoutId: string;
  handoutTitle: string;
  revealedAt: string;
  revealedTo: string;
};

function getHistoryKey(campaignId: string) {
  return `dnd-handout-reveal-log:${campaignId}`;
}

function readHistory(campaignId: string): RevealEntry[] {
  if (!campaignId) return [];
  try {
    const raw = window.localStorage.getItem(getHistoryKey(campaignId));
    return raw ? (JSON.parse(raw) as RevealEntry[]) : [];
  } catch {
    return [];
  }
}

function writeHistory(campaignId: string, entries: RevealEntry[]) {
  try {
    window.localStorage.setItem(getHistoryKey(campaignId), JSON.stringify(entries));
  } catch {
    // storage full — silent fail
  }
}

// ── Visibility helpers ─────────────────────────────────────────────────────

function visibilityLabel(visibility: string): string {
  switch (visibility) {
    case "public":
      return "Public";
    case "players":
      return "Joueurs (révélé)";
    case "gm":
      return "MJ uniquement";
    case "gm_team":
      return "Équipe MJ";
    default:
      return visibility;
  }
}

function visibilityIcon(visibility: string) {
  switch (visibility) {
    case "public":
      return <Globe size={12} />;
    case "players":
      return <Users size={12} />;
    case "gm":
      return <Lock size={12} />;
    case "gm_team":
      return <EyeOff size={12} />;
    default:
      return null;
  }
}

// ── Component ──────────────────────────────────────────────────────────────

/** @deprecated Props kept for backward compatibility until all callers use contexts. */
type HandoutPanelProps = {
  handouts?: Handout[];
  scenes?: Scene[];
  isBusy?: boolean;
  onCreateHandout?: (event: FormEvent<HTMLFormElement>) => void;
  onRevealHandout?: (handout: Handout) => void;
  onDeleteHandout?: (handout: Handout) => void;
  campaignId?: string;
};

export function HandoutPanel(props: HandoutPanelProps = {}) {
  const state = useContext(WorkspaceStateContext);
  const actions = useContext(WorkspaceActionsContext);
  const panel = useContext(PanelContext);

  const handouts = props.handouts ?? state?.handouts ?? [];
  const scenes = props.scenes ?? state?.scenes ?? [];
  const isBusy = props.isBusy ?? panel?.isBusy ?? false;
  const onCreateHandout =
    props.onCreateHandout ??
    actions?.handleCreateHandout ??
    ((event: FormEvent<HTMLFormElement>) => event.preventDefault());
  const onRevealHandout =
    props.onRevealHandout ?? actions?.handleRevealHandout ?? (() => undefined);
  const onDeleteHandout =
    props.onDeleteHandout ?? actions?.handleDeleteHandout ?? (() => undefined);
  const campaignId = props.campaignId ?? state?.selectedCampaign?.id ?? "";

  const [showCreate, setShowCreate] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState<RevealEntry[]>(() => readHistory(campaignId));

  useEffect(() => {
    setHistory(readHistory(campaignId));
  }, [campaignId]);

  function handleReveal(handout: Handout) {
    // Record in local history
    const entry: RevealEntry = {
      handoutId: handout.id,
      handoutTitle: handout.title,
      revealedAt: new Date().toISOString(),
      revealedTo: "all",
    };
    const updated = [entry, ...history].slice(0, 100); // keep last 100
    setHistory(updated);
    writeHistory(campaignId, updated);

    void onRevealHandout(handout);
  }

  const revealedCount = useMemo(
    () => handouts.filter((h) => h.is_revealed).length,
    [handouts],
  );

  return (
    <div className="gm-panel-content handout-panel" data-vtt-panel>
      {/* ── Header ──────────────────────────────────────────────── */}
      <section className="gm-panel-section">
        <header className="gm-panel-section-header">
          <strong>Documents</strong>
          <small>
            {handouts.length} document(s) · {revealedCount} révélé(s)
          </small>
        </header>

        <div className="gm-panel-actions">
          <button
            disabled={isBusy}
            onClick={() => setShowCreate(!showCreate)}
            type="button"
          >
            <Plus size={12} />
            {showCreate ? "Annuler" : "Nouveau document"}
          </button>

          {history.length > 0 && (
            <button
              className={showHistory ? "active" : ""}
              onClick={() => setShowHistory(!showHistory)}
              type="button"
            >
              <Clock size={12} />
              Historique ({history.length})
            </button>
          )}
        </div>
      </section>

      {/* ── Create form ─────────────────────────────────────────── */}
      {showCreate && (
        <section className="gm-panel-section">
          <form className="gm-panel-section" onSubmit={onCreateHandout}>
            <label>
              Titre
              <input
                name="title"
                required
                maxLength={200}
                placeholder="Titre du document"
              />
            </label>
            <label>
              Contenu
              <textarea
                name="content"
                rows={4}
                maxLength={50000}
                placeholder="Contenu du document (markdown supporté)..."
              />
            </label>
            <label>
              Visibilité
              <select name="visibility" defaultValue="gm">
                <option value="public">Public — visible par tous</option>
                <option value="players">Joueurs — révélé manuellement</option>
                <option value="gm">MJ uniquement</option>
                <option value="gm_team">Équipe MJ</option>
              </select>
            </label>
            <label>
              Scène liée (optionnel)
              <select name="scene_id" defaultValue="">
                <option value="">Aucune</option>
                {scenes.map((scene) => (
                  <option key={scene.id} value={scene.id}>
                    {scene.name}
                  </option>
                ))}
              </select>
            </label>
            <div className="gm-panel-actions">
              <button disabled={isBusy} type="submit">
                <Plus size={12} />
                Créer
              </button>
            </div>
          </form>
        </section>
      )}

      {/* ── Reveal history ───────────────────────────────────────── */}
      {showHistory && history.length > 0 && (
        <section className="gm-panel-section">
          <header className="gm-panel-section-header">
            <strong>Historique des révélations</strong>
            <small>{history.length} entrée(s)</small>
          </header>

          <div className="gm-panel-list" style={{ maxHeight: 160 }}>
            {history.map((entry, i) => (
              <div className="gm-panel-row" key={i}>
                <span>
                  <strong>{entry.handoutTitle}</strong>
                  <small>
                    {new Date(entry.revealedAt).toLocaleString()}
                  </small>
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Handout list ─────────────────────────────────────────── */}
      <section className="gm-panel-section">
        <header className="gm-panel-section-header">
          <strong>Liste</strong>
        </header>

        {handouts.length === 0 ? (
          <p className="gm-panel-muted">
            Aucun document. Créez des notes à partager avec vos joueurs.
          </p>
        ) : (
          <div className="gm-panel-list">
            {handouts.map((handout) => (
              <article
                className={`gm-panel-card ${handout.is_revealed ? "selected" : ""}`}
                key={handout.id}
              >
                <header>
                  <span>
                    <strong>{handout.title}</strong>
                    <small>
                      {visibilityIcon(handout.visibility)}
                      {" "}
                      {visibilityLabel(handout.visibility)}
                      {handout.is_revealed && " · Révélé"}
                      {handout.scene_id && " · Lié à une scène"}
                    </small>
                  </span>
                </header>

                {handout.content && (
                  <p className="gm-panel-muted" style={{ whiteSpace: "pre-wrap", lineHeight: 1.45 }}>
                    {handout.content.length > 120
                      ? handout.content.slice(0, 120) + "..."
                      : handout.content}
                  </p>
                )}

                <div className="gm-panel-actions">
                  {handout.visibility === "players" && !handout.is_revealed && (
                    <button
                      disabled={isBusy}
                      onClick={() => handleReveal(handout)}
                      type="button"
                      title="Partager aux joueurs"
                    >
                      <Eye size={12} /> Révéler
                    </button>
                  )}
                  <button
                    className="danger"
                    disabled={isBusy}
                    onClick={() => void onDeleteHandout(handout)}
                    type="button"
                    title="Supprimer"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {/* ── Footer ───────────────────────────────────────────────── */}
      <footer className="gm-panel-footer">
        <span className="gm-panel-muted">
          <BookOpen size={12} /> Les documents "Joueurs" doivent être révélés manuellement
        </span>
      </footer>
    </div>
  );
}
