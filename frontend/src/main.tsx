import React, { FormEvent, useEffect, useMemo, useState } from "react";
import ReactDOM from "react-dom/client";
import {
  Castle,
  Copy,
  DoorOpen,
  LogIn,
  Plus,
  RefreshCw,
  Shield,
  Swords,
  UserPlus,
} from "lucide-react";
import "./styles.css";

type User = {
  id: string;
  email: string;
  display_name: string;
  created_at: string;
};

type Campaign = {
  id: string;
  owner_user_id: string;
  name: string;
  description: string;
  role: "gm" | "co_gm" | "player";
  member_count: number;
  created_at: string;
  updated_at: string;
};

type Member = {
  user_id: string;
  email: string;
  display_name: string;
  role: string;
  joined_at: string;
};

type AuthResponse = {
  access_token: string;
  user: User;
};

type Invite = {
  token: string;
  campaign_id: string;
  role: string;
  expires_at: string | null;
  max_uses: number | null;
  use_count: number;
  created_at: string;
};

const API_BASE = "";
const TOKEN_STORAGE_KEY = "dnd_access_token";

function App() {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_STORAGE_KEY) ?? "");
  const [user, setUser] = useState<User | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>("");
  const [members, setMembers] = useState<Member[]>([]);
  const [latestInvite, setLatestInvite] = useState<Invite | null>(null);
  const [mode, setMode] = useState<"login" | "register">("register");
  const [message, setMessage] = useState("");
  const [isBusy, setIsBusy] = useState(false);

  const selectedCampaign = useMemo(
    () => campaigns.find((campaign) => campaign.id === selectedCampaignId) ?? campaigns[0],
    [campaigns, selectedCampaignId],
  );

  useEffect(() => {
    if (!token) {
      return;
    }
    void bootstrap(token);
  }, [token]);

  useEffect(() => {
    if (!selectedCampaign) {
      setMembers([]);
      return;
    }
    setSelectedCampaignId(selectedCampaign.id);
    void loadMembers(selectedCampaign.id);
  }, [selectedCampaign?.id]);

  async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    });

    if (!response.ok) {
      const body = await response.json().catch(() => ({ detail: "Request failed" }));
      throw new Error(body.detail ?? "Request failed");
    }

    return response.json() as Promise<T>;
  }

  async function bootstrap(activeToken: string) {
    try {
      const response = await fetch("/api/auth/me", {
        headers: { Authorization: `Bearer ${activeToken}` },
      });
      if (!response.ok) {
        throw new Error("Session expired");
      }
      setUser((await response.json()) as User);
      await loadCampaigns(activeToken);
    } catch {
      logout();
    }
  }

  async function loadCampaigns(activeToken = token) {
    const response = await fetch("/api/campaigns", {
      headers: { Authorization: `Bearer ${activeToken}` },
    });
    if (!response.ok) {
      throw new Error("Unable to load campaigns");
    }
    const data = (await response.json()) as Campaign[];
    setCampaigns(data);
    if (data.length > 0) {
      setSelectedCampaignId((current) => current || data[0].id);
    }
  }

  async function loadMembers(campaignId: string) {
    try {
      setMembers(await request<Member[]>(`/api/campaigns/${campaignId}/members`));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to load members");
    }
  }

  async function handleAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsBusy(true);
    setMessage("");
    const form = new FormData(event.currentTarget);
    const payload =
      mode === "register"
        ? {
            email: String(form.get("email")),
            display_name: String(form.get("display_name")),
            password: String(form.get("password")),
          }
        : {
            email: String(form.get("email")),
            password: String(form.get("password")),
          };

    try {
      const auth = await request<AuthResponse>(`/api/auth/${mode}`, {
        method: "POST",
        body: JSON.stringify(payload),
      });
      localStorage.setItem(TOKEN_STORAGE_KEY, auth.access_token);
      setToken(auth.access_token);
      setUser(auth.user);
      setMessage(mode === "register" ? "Compte cree." : "Connexion active.");
      await loadCampaigns(auth.access_token);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Auth failed");
    } finally {
      setIsBusy(false);
    }
  }

  async function handleCreateCampaign(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsBusy(true);
    setMessage("");
    const form = new FormData(event.currentTarget);
    try {
      const campaign = await request<Campaign>("/api/campaigns", {
        method: "POST",
        body: JSON.stringify({
          name: String(form.get("name")),
          description: String(form.get("description")),
        }),
      });
      setCampaigns((current) => [campaign, ...current]);
      setSelectedCampaignId(campaign.id);
      setLatestInvite(null);
      event.currentTarget.reset();
      setMessage("Campagne creee.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to create campaign");
    } finally {
      setIsBusy(false);
    }
  }

  async function handleCreateInvite() {
    if (!selectedCampaign) {
      return;
    }
    setIsBusy(true);
    setMessage("");
    try {
      const invite = await request<Invite>(`/api/campaigns/${selectedCampaign.id}/invites`, {
        method: "POST",
        body: JSON.stringify({ role: "player", expires_in_days: 14, max_uses: 10 }),
      });
      setLatestInvite(invite);
      setMessage("Invitation creee.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to create invite");
    } finally {
      setIsBusy(false);
    }
  }

  async function copyInvite() {
    if (!latestInvite) {
      return;
    }
    const url = `${window.location.origin}/invite/${latestInvite.token}`;
    await navigator.clipboard.writeText(url);
    setMessage("Lien copie.");
  }

  function logout() {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    setToken("");
    setUser(null);
    setCampaigns([]);
    setMembers([]);
    setLatestInvite(null);
    setSelectedCampaignId("");
  }

  if (!user) {
    return (
      <main className="auth-shell">
        <section className="auth-visual">
          <div className="brand-mark">
            <Swords aria-hidden="true" />
            DnD Interface
          </div>
          <h1>Prepare la table avant que les joueurs arrivent.</h1>
          <p>
            Le socle MVP commence par les comptes, les campagnes et les invitations.
            La carte, les fiches et le combat viendront ensuite sur cette base.
          </p>
          <div className="status-strip">
            <span>Backend dedie</span>
            <span>PostgreSQL isole</span>
            <span>Invitations MJ</span>
          </div>
        </section>

        <section className="auth-panel" aria-label="Connexion">
          <div className="auth-tabs" role="tablist">
            <button
              className={mode === "register" ? "active" : ""}
              onClick={() => setMode("register")}
              type="button"
            >
              <UserPlus aria-hidden="true" />
              Inscription
            </button>
            <button
              className={mode === "login" ? "active" : ""}
              onClick={() => setMode("login")}
              type="button"
            >
              <LogIn aria-hidden="true" />
              Connexion
            </button>
          </div>

          <form onSubmit={handleAuth} className="form-stack">
            {mode === "register" && (
              <label>
                Nom affiche
                <input name="display_name" minLength={2} maxLength={80} required />
              </label>
            )}
            <label>
              Email
              <input name="email" type="email" required />
            </label>
            <label>
              Mot de passe
              <input name="password" type="password" minLength={8} required />
            </label>
            <button className="primary-button" disabled={isBusy} type="submit">
              {isBusy ? "Traitement..." : mode === "register" ? "Creer le compte" : "Se connecter"}
            </button>
          </form>
          {message && <p className="message">{message}</p>}
        </section>
      </main>
    );
  }

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand-mark compact">
          <Swords aria-hidden="true" />
          DnD
        </div>
        <button className="ghost-button" onClick={() => void loadCampaigns()} type="button">
          <RefreshCw aria-hidden="true" />
          Actualiser
        </button>
        <button className="ghost-button" onClick={logout} type="button">
          <DoorOpen aria-hidden="true" />
          Sortir
        </button>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div>
            <p className="small-label">Connecte comme {user.display_name}</p>
            <h1>Campagnes</h1>
          </div>
          <Shield aria-hidden="true" />
        </header>

        <div className="workspace-grid">
          <section className="panel">
            <h2>Nouvelle campagne</h2>
            <form onSubmit={handleCreateCampaign} className="form-stack">
              <label>
                Nom
                <input name="name" minLength={2} maxLength={120} required />
              </label>
              <label>
                Description
                <textarea name="description" maxLength={2000} rows={4} />
              </label>
              <button className="primary-button" disabled={isBusy} type="submit">
                <Plus aria-hidden="true" />
                Creer
              </button>
            </form>
          </section>

          <section className="panel campaign-list">
            <h2>Tables actives</h2>
            {campaigns.length === 0 ? (
              <div className="empty-state">
                <Castle aria-hidden="true" />
                <p>Aucune campagne pour le moment.</p>
              </div>
            ) : (
              campaigns.map((campaign) => (
                <button
                  className={`campaign-row ${selectedCampaign?.id === campaign.id ? "selected" : ""}`}
                  key={campaign.id}
                  onClick={() => {
                    setSelectedCampaignId(campaign.id);
                    setLatestInvite(null);
                  }}
                  type="button"
                >
                  <span>
                    <strong>{campaign.name}</strong>
                    <small>{campaign.member_count} membre(s)</small>
                  </span>
                  <em>{campaign.role}</em>
                </button>
              ))
            )}
          </section>

          <section className="panel detail-panel">
            <h2>{selectedCampaign?.name ?? "Selection"}</h2>
            {selectedCampaign ? (
              <>
                <p className="muted">
                  {selectedCampaign.description || "Aucune description pour cette campagne."}
                </p>
                <div className="action-row">
                  <button className="primary-button" disabled={isBusy} onClick={handleCreateInvite} type="button">
                    <UserPlus aria-hidden="true" />
                    Inviter un joueur
                  </button>
                  {latestInvite && (
                    <button className="ghost-button" onClick={copyInvite} type="button">
                      <Copy aria-hidden="true" />
                      Copier le lien
                    </button>
                  )}
                </div>
                {latestInvite && (
                  <code className="invite-code">
                    {window.location.origin}/invite/{latestInvite.token}
                  </code>
                )}
                <h3>Membres</h3>
                <div className="member-list">
                  {members.map((member) => (
                    <div className="member-row" key={member.user_id}>
                      <span>{member.display_name}</span>
                      <small>{member.role}</small>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <p className="muted">Cree ou selectionne une campagne.</p>
            )}
          </section>
        </div>
        {message && <p className="message docked">{message}</p>}
      </section>
    </main>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

