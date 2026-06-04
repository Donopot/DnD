import { Edit3, Plus, Send, Shield, Sparkles, User } from "lucide-react";
import { useEffect, useState } from "react";

import { apiRequest } from "../api/client";
import type { Character } from "../api/types";

type PersonalCharactersSectionProps = {
  token: string;
  /** Si le joueur a rejoint une campagne, on peut proposer la soumission */
  campaignId?: string;
  onOpenEditor?: (character: Character) => void;
};

export function PersonalCharactersSection({
  token,
  campaignId,
  onOpenEditor,
}: PersonalCharactersSectionProps) {
  const [characters, setCharacters] = useState<Character[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [submitMessage, setSubmitMessage] = useState("");

  async function loadCharacters() {
    setLoading(true);
    setError("");
    try {
      const data = await apiRequest<Character[]>("/api/characters/mine", token);
      setCharacters(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCharacters();
  }, [token]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const name = newName.trim();
    if (!name || name.length < 2) return;

    setCreating(true);
    try {
      const created = await apiRequest<Character>("/api/characters", token, {
        method: "POST",
        body: JSON.stringify({ name }),
      });
      setCharacters((prev) => [...prev, created]);
      setNewName("");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erreur création");
    } finally {
      setCreating(false);
    }
  }

  async function handleSubmit(character: Character) {
    if (!campaignId) return;
    setSubmittingId(character.id);
    setSubmitMessage("");
    try {
      const data = await apiRequest<{ detail?: string }>(`/api/characters/${character.id}/submit`, token, {
        method: "POST",
        body: JSON.stringify({ campaign_id: campaignId }),
      });
      // Update local state: mark as submitted
      setCharacters((prev) =>
        prev.map((c) =>
          c.id === character.id
            ? {
                ...c,
                // We store submission state locally
                ...({ _submitted: true } as Partial<Character>),
              }
            : c,
        ),
      );
      setSubmitMessage("✅ Personnage soumis au MJ !");
    } catch (err: unknown) {
      setSubmitMessage(`❌ ${err instanceof Error ? err.message : "Erreur soumission"}`);
    } finally {
      setSubmittingId(null);
    }
  }

  function getAttrMod(value: number): string {
    const mod = Math.floor((value - 10) / 2);
    return mod >= 0 ? `+${mod}` : `${mod}`;
  }

  const personalChars = characters.filter(
    (c) => !c.campaign_id || (c as Character & { _submitted?: boolean })._submitted === undefined,
  );

  return (
    <section className="personal-chars-section">
      <div className="personal-chars-header">
        <h3>
          <User size={18} />
          Mes Personnages
        </h3>
        <span className="char-count">
          {personalChars.length} perso{personalChars.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* ── Quick Create ─────────────────────────────────────── */}
      <form className="quick-create-form" onSubmit={handleCreate}>
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Nom du nouveau personnage..."
          minLength={2}
          maxLength={100}
        />
        <button
          className="icon-button"
          type="submit"
          disabled={creating || newName.trim().length < 2}
          title="Créer"
        >
          <Plus size={16} />
        </button>
      </form>

      {/* ── Error ────────────────────────────────────────────── */}
      {error && <p className="error-text">{error}</p>}
      {submitMessage && <p className="message-text">{submitMessage}</p>}

      {/* ── List ─────────────────────────────────────────────── */}
      {loading ? (
        <p className="muted">Chargement...</p>
      ) : personalChars.length === 0 ? (
        <p className="muted">Aucun personnage pour l'instant. Crée ton premier héros ci-dessus !</p>
      ) : (
        <ul className="personal-chars-list">
          {personalChars.map((ch) => (
            <li key={ch.id} className="personal-char-card">
              <div className="char-card-left">
                <span className="char-icon">
                  <Shield size={18} />
                </span>
                <div className="char-card-info">
                  <strong className="char-name">
                    {ch.name}
                    {ch.class_name && (
                      <span className="char-sub">
                        {ch.class_name} {ch.level > 0 && `Niv. ${ch.level}`}
                      </span>
                    )}
                  </strong>
                  <span className="char-stats">
                    {ch.ancestry && <span>{ch.ancestry}</span>}
                    {ch.attributes && (
                      <span className="stat-line">
                        {Object.entries(ch.attributes)
                          .slice(0, 3)
                          .map(([attr, val]) => (
                            <span key={attr} className="attr-chip">
                              {attr.toUpperCase()} {val} ({getAttrMod(val)})
                            </span>
                          ))}
                      </span>
                    )}
                  </span>
                </div>
              </div>
              <div className="char-card-actions">
                {onOpenEditor && (
                  <button className="icon-button" title="Éditer" onClick={() => onOpenEditor(ch)}>
                    <Edit3 size={14} />
                  </button>
                )}
                {campaignId && (
                  <button
                    className="icon-button submit-button"
                    title="Soumettre au MJ"
                    disabled={submittingId === ch.id}
                    onClick={() => handleSubmit(ch)}
                  >
                    {submittingId === ch.id ? (
                      <Sparkles size={14} className="spin" />
                    ) : (
                      <Send size={14} />
                    )}
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
