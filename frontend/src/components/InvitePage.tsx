import { Castle, Swords, UserPlus } from "lucide-react";
import { useState } from "react";

type InvitePreview = {
  campaign_name: string;
  role: string;
  remaining_uses: number | null;
  expires_at: string | null;
};

type InvitePageProps = {
  inviteToken: string;
  token: string;
  userDisplayName: string | null;
  onTokenChange: (token: string) => void;
  onJoined: () => void;
};

export function InvitePage({
  inviteToken,
  token: currentToken,
  userDisplayName,
  onTokenChange,
  onJoined,
}: InvitePageProps) {
  const [preview, setPreview] = useState<InvitePreview | null>(null);
  const [error, setError] = useState("");
  const [isBusy, setIsBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);

  // Load invite preview
  async function loadPreview() {
    try {
      const response = await fetch(`/api/invites/${inviteToken}`);
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.detail ?? "Invitation introuvable ou expirée");
      }
      setPreview(await response.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur chargement invitation");
    } finally {
      setLoaded(true);
    }
  }

  if (!loaded) {
    void loadPreview();
    return (
      <main className="invite-shell">
        <p>Chargement de l'invitation...</p>
      </main>
    );
  }

  if (error) {
    return (
      <main className="invite-shell">
        <div className="invite-card">
          <Castle size={48} />
          <h2>Invitation invalide</h2>
          <p>{error}</p>
          <a href="/" className="primary-button">
            Retour à l'accueil
          </a>
        </div>
      </main>
    );
  }

  if (!preview) {
    return (
      <main className="invite-shell">
        <p>Chargement...</p>
      </main>
    );
  }

  // User is already logged in → show join button
  async function handleJoin() {
    setIsBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/invites/${inviteToken}/join`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${currentToken}`,
        },
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({ detail: "Join failed" }));
        throw new Error(body.detail ?? "Join failed");
      }
      onJoined();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible de rejoindre");
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <main className="invite-shell">
      <div className="invite-card invite-join">
        <Swords size={48} />
        <h2>{preview.campaign_name}</h2>
        <p>
          Connecté comme <strong>{userDisplayName}</strong> · rôle{" "}
          <strong>{preview.role === "player" ? "Joueur" : preview.role}</strong>
        </p>
        {preview.remaining_uses !== null && <p>Places restantes: {preview.remaining_uses}</p>}
        {error && <p className="error-text">{error}</p>}
        <button className="primary-button" disabled={isBusy} onClick={handleJoin} type="button">
          <UserPlus aria-hidden="true" />
          Rejoindre la campagne
        </button>
      </div>
    </main>
  );
}
