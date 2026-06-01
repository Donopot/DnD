import { useState } from "react";
import { ArrowLeft, Castle, Swords, UserPlus } from "lucide-react";
import { AuthView } from "./AuthView";
import type { AuthResponse } from "../api/types";

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
  const [mode, setMode] = useState<"login" | "register">("register");
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
          <a href="/" className="primary-button">Retour à l'accueil</a>
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

  // Not logged in → show login/register (player account type)
  if (!currentToken) {
    async function handleAuth(auth: AuthResponse, wasRegistration: boolean) {
      onTokenChange(auth.access_token);
      // Registration auto-joins the campaign in the backend:
      // skip the manual "Rejoindre" button and go straight to the campaign view.
      if (wasRegistration) {
        onJoined();
      }
    }

    return (
      <main className="invite-shell">
        <div className="invite-card">
          <Swords size={32} />
          <h2>Tu es invité(e) à rejoindre</h2>
          <h1>{preview.campaign_name}</h1>
          <p>
            Rôle: <strong>{preview.role === "player" ? "Joueur" : preview.role}</strong>
          </p>
          {preview.remaining_uses !== null && (
            <p>Places restantes: {preview.remaining_uses}</p>
          )}
          <p className="muted">Connecte-toi ou crée un compte pour accepter.</p>

          <AuthView
            mode={mode}
            accountType="player"
            inviteToken={inviteToken}
            isBusy={isBusy}
            onModeChange={setMode}
            onBack={() => {
              window.location.href = "/";
            }}
            onSubmit={async (event) => {
              event.preventDefault();
              setIsBusy(true);
              const form = new FormData(event.currentTarget);
              const payload =
                mode === "register"
                  ? {
                      email: String(form.get("email")),
                      display_name: String(form.get("display_name")),
                      password: String(form.get("password")),
                      account_type: "player",
                      invite_token: inviteToken,
                    }
                  : {
                      email: String(form.get("email")),
                      password: String(form.get("password")),
                    };

              try {
                const response = await fetch(`/api/auth/${mode}`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(payload),
                });
                if (!response.ok) {
                  const body = await response.json().catch(() => ({ detail: "Échec" }));
                  throw new Error(body.detail ?? "Échec");
                }
                handleAuth(await response.json(), mode === "register");
              } catch (err) {
                setError(err instanceof Error ? err.message : "Échec authentification");
              } finally {
                setIsBusy(false);
              }
            }}
          />
        </div>
      </main>
    );
  }

  // Logged in → show join button
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
          Connecté comme <strong>{userDisplayName}</strong> · rôle <strong>{preview.role === "player" ? "Joueur" : preview.role}</strong>
        </p>
        {preview.remaining_uses !== null && (
          <p>Places restantes: {preview.remaining_uses}</p>
        )}
        {error && <p className="error-text">{error}</p>}
        <button className="primary-button" disabled={isBusy} onClick={handleJoin} type="button">
          <UserPlus aria-hidden="true" />
          Rejoindre la campagne
        </button>
      </div>
    </main>
  );
}
