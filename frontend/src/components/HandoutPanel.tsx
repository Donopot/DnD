import { BookOpen, Eye, EyeOff, Globe, Lock, Plus, Trash2, Users } from "lucide-react";
import { type FormEvent, useState } from "react";

import type { Handout, Scene } from "../api/types";

type HandoutPanelProps = {
  handouts: Handout[];
  scenes: Scene[];
  isBusy: boolean;
  onCreateHandout: (event: FormEvent<HTMLFormElement>) => void;
  onRevealHandout: (handout: Handout) => void;
  onDeleteHandout: (handout: Handout) => void;
};

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
      return <Globe aria-hidden="true" />;
    case "players":
      return <Users aria-hidden="true" />;
    case "gm":
      return <Lock aria-hidden="true" />;
    case "gm_team":
      return <EyeOff aria-hidden="true" />;
    default:
      return null;
  }
}

export function HandoutPanel({
  handouts,
  scenes,
  isBusy,
  onCreateHandout,
  onRevealHandout,
  onDeleteHandout,
}: HandoutPanelProps) {
  const [showCreate, setShowCreate] = useState(false);

  return (
    <div className="handout-section">
      <div className="section-heading">
        <h3>Handouts</h3>
        <BookOpen aria-hidden="true" />
      </div>

      <div className="handout-actions">
        <button
          className="ghost-button"
          disabled={isBusy}
          onClick={() => setShowCreate(!showCreate)}
          type="button"
        >
          <Plus aria-hidden="true" />
          {showCreate ? "Annuler" : "Nouveau handout"}
        </button>
      </div>

      {showCreate && (
        <form className="handout-form card" onSubmit={onCreateHandout}>
          <label>
            Titre
            <input name="title" required maxLength={200} placeholder="Titre du document" />
          </label>
          <label>
            Contenu
            <textarea
              name="content"
              rows={4}
              maxLength={50000}
              placeholder="Contenu du handout (markdown supporté)..."
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
          <button className="primary-button" disabled={isBusy} type="submit">
            <Plus aria-hidden="true" />
            Créer
          </button>
        </form>
      )}

      {handouts.length === 0 ? (
        <div className="empty-state compact-empty">
          <BookOpen aria-hidden="true" />
          <p>Aucun handout pour cette campagne.</p>
          <small>Créez des documents à partager avec vos joueurs.</small>
        </div>
      ) : (
        <div className="handout-list">
          {handouts.map((handout) => (
            <article
              className={`handout-row ${handout.is_revealed ? "revealed" : ""}`}
              key={handout.id}
            >
              <div className="handout-main">
                <strong>{handout.title}</strong>
                <small>
                  {visibilityIcon(handout.visibility)}
                  {visibilityLabel(handout.visibility)}
                  {handout.is_revealed && " · Révélé"}
                  {handout.scene_id && " · Lié à une scène"}
                </small>
                {handout.content && (
                  <p className="handout-preview">
                    {handout.content.slice(0, 120)}
                    {handout.content.length > 120 ? "..." : ""}
                  </p>
                )}
              </div>

              <div className="handout-row-actions">
                {handout.visibility === "players" && !handout.is_revealed && (
                  <button
                    className="ghost-button"
                    disabled={isBusy}
                    onClick={() => onRevealHandout(handout)}
                    type="button"
                    title="Partager aux joueurs"
                  >
                    <Eye aria-hidden="true" />
                  </button>
                )}
                <button
                  className="ghost-button danger"
                  disabled={isBusy}
                  onClick={() => onDeleteHandout(handout)}
                  type="button"
                  title="Supprimer"
                >
                  <Trash2 aria-hidden="true" />
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
