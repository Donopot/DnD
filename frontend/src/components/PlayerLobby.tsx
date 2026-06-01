import { FormEvent, useState } from "react";
import { Castle, DoorOpen, UserPlus } from "lucide-react";
import { InvitePreviewCard } from "./InvitePreviewCard";
import { PersonalCharactersSection } from "./PersonalCharactersSection";

type PlayerLobbyProps = {
  token: string;
  userDisplayName: string;
  onLogout: () => void;
  onJoined: () => void;
  /** If the player is already in a campaign, allow submitting characters */
  activeCampaignId?: string;
};

export function PlayerLobby({
  token,
  userDisplayName,
  onLogout,
  onJoined,
  activeCampaignId,
}: PlayerLobbyProps) {
  const [inviteCode, setInviteCode] = useState("");
  const [submittedToken, setSubmittedToken] = useState<string | null>(null);
  const [resetKey, setResetKey] = useState(0);

  function handleSubmitInvite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const code = inviteCode.trim();
    if (!code) return;

    // Extract token from full URL (e.g. https://.../invite/abc123) or raw code
    const match = code.match(/\/invite\/([\w-]+)/);
    const token = match ? match[1] : code;

    setSubmittedToken(token);
    setResetKey((k) => k + 1);
  }

  return (
    <main className="lobby-shell player-lobby">
      {/* ── Header ─────────────────────────────────────────────── */}
      <header className="lobby-header">
        <div className="brand-mark compact">
          <Castle aria-hidden="true" />
          DnD
        </div>
        <div className="lobby-user-info">
          <span>{userDisplayName}</span>
          <span className="role-badge player">Joueur</span>
        </div>
        <button className="ghost-button" onClick={onLogout} type="button">
          <DoorOpen aria-hidden="true" size={16} />
          Déconnexion
        </button>
      </header>

      {/* ── Content ────────────────────────────────────────────── */}
      <section className="lobby-content">
        {/* ── Invite section ────────────────────────────────── */}
        <div className="lobby-hero">
          <Castle size={64} />
          <h2>Bienvenue, {userDisplayName} !</h2>
          <p className="muted">
            Tu n'as pas encore rejoint de campagne. Entre le code d'invitation
            que ton MJ t'a envoyé pour commencer l'aventure.
          </p>
        </div>

        <div className="lobby-invite-section">
          <form onSubmit={handleSubmitInvite} className="invite-code-form">
            <label>
              Code d'invitation ou lien
              <div className="invite-input-row">
                <input
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value)}
                  placeholder="abc123 ou https://.../invite/abc123"
                  maxLength={200}
                />
                <button className="primary-button" type="submit">
                  <UserPlus size={16} />
                  Vérifier
                </button>
              </div>
            </label>
          </form>

          {submittedToken && (
            <InvitePreviewCard
              key={resetKey}
              inviteToken={submittedToken}
              authToken={token}
              onJoined={onJoined}
            />
          )}
        </div>

        {/* ── Personal Characters ───────────────────────────── */}
        <PersonalCharactersSection
          token={token}
          campaignId={activeCampaignId}
        />
      </section>

      {/* ── Footer ─────────────────────────────────────────────── */}
      <footer className="lobby-footer">
        <span>En attente d'une invitation de ton MJ</span>
      </footer>
    </main>
  );
}
