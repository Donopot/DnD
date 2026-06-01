import { FormEvent } from "react";
import { Castle, Crown, DoorOpen, Plus } from "lucide-react";

type GmLobbyProps = {
  userDisplayName: string;
  isBusy: boolean;
  message: string;
  onCreateCampaign: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  onLogout: () => void;
};

export function GmLobby({ userDisplayName, isBusy, message, onCreateCampaign, onLogout }: GmLobbyProps) {
  return (
    <main className="lobby-shell gm-lobby">
      {/* ── Header ─────────────────────────────────────────────── */}
      <header className="lobby-header">
        <div className="brand-mark compact">
          <Castle aria-hidden="true" />
          DnD
        </div>
        <div className="lobby-user-info">
          <span>{userDisplayName}</span>
          <span className="role-badge gm">MJ</span>
        </div>
        <button className="ghost-button" onClick={onLogout} type="button">
          <DoorOpen aria-hidden="true" size={16} />
          Déconnexion
        </button>
      </header>

      {/* ── Content ────────────────────────────────────────────── */}
      <section className="lobby-content">
        <div className="lobby-hero">
          <Crown size={64} />
          <h2>Bienvenue, {userDisplayName} !</h2>
          <p className="muted">
            Tu n'as pas encore de campagne. Crée ta première table pour
            commencer à préparer tes scènes, tokens et invitations.
          </p>
        </div>

        <div className="lobby-create-section">
          <h3>Créer une campagne</h3>
          <form onSubmit={onCreateCampaign} className="form-stack">
            <label>
              Nom de la campagne
              <input
                name="name"
                minLength={2}
                maxLength={120}
                required
                placeholder="Les Oubliés de Faerûn"
              />
            </label>
            <label>
              Description (optionnelle)
              <textarea
                name="description"
                maxLength={2000}
                rows={4}
                placeholder="Une brève description pour tes joueurs..."
              />
            </label>
            {message && <p className="message-text">{message}</p>}
            <button className="primary-button" disabled={isBusy} type="submit">
              <Plus aria-hidden="true" size={16} />
              {isBusy ? "Création..." : "Créer la campagne"}
            </button>
          </form>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────────── */}
      <footer className="lobby-footer">
        <span>Prêt à écrire ta légende</span>
      </footer>
    </main>
  );
}
