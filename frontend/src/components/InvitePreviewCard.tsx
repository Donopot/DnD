import { Castle, Swords, UserPlus } from "lucide-react";
import { useEffect, useState } from "react";

import { apiRequest } from "../api/client";

type InvitePreviewData = {
  campaign_name: string;
  role: string;
  remaining_uses: number | null;
  expires_at: string | null;
};

type InvitePreviewCardProps = {
  inviteToken: string;
  authToken: string;
  onJoined: () => void;
};

export function InvitePreviewCard({ inviteToken, authToken, onJoined }: InvitePreviewCardProps) {
  const [preview, setPreview] = useState<InvitePreviewData | null>(null);
  const [error, setError] = useState("");
  const [isBusy, setIsBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch(`/api/invites/${inviteToken}`);
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.detail ?? "Invitation introuvable ou expirée");
        }
        setPreview(await res.json());
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erreur chargement invitation");
      } finally {
        setLoaded(true);
      }
    })();
  }, [inviteToken]);

  if (!loaded) {
    return <p>Chargement de l'invitation...</p>;
  }

  if (error) {
    return (
      <div className="invite-preview-card error">
        <Castle size={32} />
        <p>{error}</p>
      </div>
    );
  }

  if (!preview) {
    return <p>Chargement...</p>;
  }

  async function handleJoin() {
    setIsBusy(true);
    setError("");
    try {
      await apiRequest(`/api/invites/${inviteToken}/join`, authToken, { method: "POST" });
      onJoined();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Échec");
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <div className="invite-preview-card">
      <Swords size={32} />
      <h3>{preview.campaign_name}</h3>
      <p>
        Rôle: <strong>{preview.role === "player" ? "Joueur" : preview.role}</strong>
      </p>
      {preview.remaining_uses !== null && <p>Places restantes: {preview.remaining_uses}</p>}
      {error && <p className="error-text">{error}</p>}
      <button className="primary-button" disabled={isBusy} onClick={handleJoin} type="button">
        <UserPlus size={16} />
        {isBusy ? "Rejoindre..." : "Rejoindre la campagne"}
      </button>
    </div>
  );
}
