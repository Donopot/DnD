import React, { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import ReactDOM from "react-dom/client";
import {
  Castle,
  Copy,
  Dices,
  DoorOpen,
  HeartPulse,
  LogIn,
  Plus,
  RefreshCw,
  Shield,
  ScrollText,
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

type Character = {
  id: string;
  campaign_id: string;
  owner_user_id: string | null;
  name: string;
  ancestry: string;
  class_name: string;
  level: number;
  armor_class: number;
  speed: number;
  proficiency_bonus: number;
  hp_current: number;
  hp_max: number;
  attributes: Record<"str" | "dex" | "con" | "int" | "wis" | "cha", number>;
  skills: Record<string, unknown>;
  saving_throws: Record<string, unknown>;
  attacks: Record<string, unknown>[];
  inventory: Record<string, unknown>[];
  spells: Record<string, unknown>[];
  resources: Record<string, unknown>[];
  notes: string;
  created_at: string;
  updated_at: string;
};

type Roll = {
  id: string;
  campaign_id: string;
  user_id: string;
  character_id: string | null;
  visibility: "public" | "gm";
  label: string;
  formula: string;
  mode: "normal" | "advantage" | "disadvantage";
  total: number;
  detail: Record<string, unknown>;
  created_at: string;
};

type GameLogEntry = {
  id: string;
  campaign_id: string;
  user_id: string | null;
  character_id: string | null;
  entry_type: "roll" | "note" | "system";
  visibility: "public" | "gm";
  message: string;
  payload: Record<string, unknown>;
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
  const [characters, setCharacters] = useState<Character[]>([]);
  const [selectedCharacterId, setSelectedCharacterId] = useState<string>("");
  const [rolls, setRolls] = useState<Roll[]>([]);
  const [logEntries, setLogEntries] = useState<GameLogEntry[]>([]);
  const [presenceCount, setPresenceCount] = useState(0);
  const [realtimeStatus, setRealtimeStatus] = useState<"offline" | "connecting" | "online">("offline");
  const [latestInvite, setLatestInvite] = useState<Invite | null>(null);
  const [mode, setMode] = useState<"login" | "register">("register");
  const [message, setMessage] = useState("");
  const [isBusy, setIsBusy] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  const selectedCampaign = useMemo(
    () => campaigns.find((campaign) => campaign.id === selectedCampaignId) ?? campaigns[0],
    [campaigns, selectedCampaignId],
  );
  const selectedCharacter = useMemo(
    () => characters.find((character) => character.id === selectedCharacterId) ?? characters[0],
    [characters, selectedCharacterId],
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
      setCharacters([]);
      setRolls([]);
      setLogEntries([]);
      setPresenceCount(0);
      return;
    }
    setSelectedCampaignId(selectedCampaign.id);
    void loadMembers(selectedCampaign.id);
    void loadCharacters(selectedCampaign.id);
    void loadSessionLog(selectedCampaign.id);
  }, [selectedCampaign?.id]);

  useEffect(() => {
    wsRef.current?.close();
    setPresenceCount(0);
    setRealtimeStatus("offline");

    if (!token || !selectedCampaign?.id) {
      return;
    }

    const protocol = window.location.protocol === "https:" ? "wss" : "ws";
    const socket = new WebSocket(
      `${protocol}://${window.location.host}/ws/campaigns/${selectedCampaign.id}?token=${encodeURIComponent(token)}`,
    );
    wsRef.current = socket;
    setRealtimeStatus("connecting");

    socket.onopen = () => {
      setRealtimeStatus("online");
      socket.send(JSON.stringify({ type: "ping" }));
    };

    socket.onmessage = (event) => {
      const payload = JSON.parse(event.data);
      if (typeof payload.presence_count === "number") {
        setPresenceCount(payload.presence_count);
      }
      if (payload.type === "session_changed") {
        void loadSessionLog(selectedCampaign.id);
      }
    };

    socket.onclose = () => {
      if (wsRef.current === socket) {
        setRealtimeStatus("offline");
      }
    };

    socket.onerror = () => {
      setRealtimeStatus("offline");
    };

    return () => {
      socket.close();
    };
  }, [token, selectedCampaign?.id]);

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

  async function loadCharacters(campaignId: string) {
    try {
      const data = await request<Character[]>(`/api/campaigns/${campaignId}/characters`);
      setCharacters(data);
      setSelectedCharacterId((current) => current || data[0]?.id || "");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to load characters");
    }
  }

  async function loadSessionLog(campaignId: string) {
    try {
      const [rollData, logData] = await Promise.all([
        request<Roll[]>(`/api/campaigns/${campaignId}/rolls`),
        request<GameLogEntry[]>(`/api/campaigns/${campaignId}/log`),
      ]);
      setRolls(rollData);
      setLogEntries(logData);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to load session log");
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
      setCharacters([]);
      setRolls([]);
      setLogEntries([]);
      setPresenceCount(0);
      setSelectedCharacterId("");
      event.currentTarget.reset();
      setMessage("Campagne creee.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to create campaign");
    } finally {
      setIsBusy(false);
    }
  }

  async function handleCreateCharacter(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedCampaign) {
      return;
    }
    setIsBusy(true);
    setMessage("");
    const form = new FormData(event.currentTarget);
    const level = Number(form.get("level") || 1);
    const hpMax = Number(form.get("hp_max") || 1);
    try {
      const character = await request<Character>(`/api/campaigns/${selectedCampaign.id}/characters`, {
        method: "POST",
        body: JSON.stringify({
          name: String(form.get("name")),
          ancestry: String(form.get("ancestry")),
          class_name: String(form.get("class_name")),
          level,
          armor_class: Number(form.get("armor_class") || 10),
          speed: Number(form.get("speed") || 30),
          proficiency_bonus: Math.max(2, Math.ceil(level / 4) + 1),
          hp_current: hpMax,
          hp_max: hpMax,
          attributes: {
            str: Number(form.get("str") || 10),
            dex: Number(form.get("dex") || 10),
            con: Number(form.get("con") || 10),
            int: Number(form.get("int") || 10),
            wis: Number(form.get("wis") || 10),
            cha: Number(form.get("cha") || 10),
          },
          inventory: [],
          spells: [],
          attacks: [],
          resources: [],
          notes: String(form.get("notes")),
        }),
      });
      setCharacters((current) => [character, ...current]);
      setSelectedCharacterId(character.id);
      event.currentTarget.reset();
      setMessage("Personnage cree.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to create character");
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

  async function handleRoll(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedCampaign) {
      return;
    }
    setIsBusy(true);
    setMessage("");
    const form = new FormData(event.currentTarget);
    const characterId = String(form.get("character_id") || "");
    try {
      const roll = await request<Roll>(`/api/campaigns/${selectedCampaign.id}/rolls`, {
        method: "POST",
        body: JSON.stringify({
          formula: String(form.get("formula")),
          label: String(form.get("label")),
          mode: String(form.get("mode")),
          visibility: String(form.get("visibility")),
          character_id: characterId || null,
        }),
      });
      setRolls((current) => [roll, ...current].slice(0, 100));
      await loadSessionLog(selectedCampaign.id);
      setMessage(`Jet: ${roll.total}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to roll dice");
    } finally {
      setIsBusy(false);
    }
  }

  async function handleLogNote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedCampaign) {
      return;
    }
    setIsBusy(true);
    setMessage("");
    const form = new FormData(event.currentTarget);
    try {
      await request<GameLogEntry>(`/api/campaigns/${selectedCampaign.id}/log`, {
        method: "POST",
        body: JSON.stringify({
          message: String(form.get("message")),
          visibility: String(form.get("visibility")),
        }),
      });
      event.currentTarget.reset();
      await loadSessionLog(selectedCampaign.id);
      setMessage("Note ajoutee au journal.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to add note");
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
    setCharacters([]);
    setRolls([]);
    setLogEntries([]);
    setPresenceCount(0);
    setSelectedCharacterId("");
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
          <div className="topbar-status">
            <span className={`realtime-pill ${realtimeStatus}`}>{realtimeStatus}</span>
            <span>{presenceCount} connecte(s)</span>
            <Shield aria-hidden="true" />
          </div>
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
                <div className="character-section">
                  <div className="section-heading">
                    <h3>Personnages</h3>
                    <ScrollText aria-hidden="true" />
                  </div>
                  <form className="character-form" onSubmit={handleCreateCharacter}>
                    <label>
                      Nom
                      <input name="name" minLength={2} maxLength={120} required />
                    </label>
                    <label>
                      Origine
                      <input name="ancestry" maxLength={80} placeholder="Humain, elfe..." />
                    </label>
                    <label>
                      Classe
                      <input name="class_name" maxLength={80} placeholder="Guerrier, mage..." />
                    </label>
                    <div className="mini-grid">
                      <label>
                        Niveau
                        <input name="level" type="number" min={1} max={20} defaultValue={1} />
                      </label>
                      <label>
                        PV max
                        <input name="hp_max" type="number" min={1} defaultValue={10} />
                      </label>
                      <label>
                        CA
                        <input name="armor_class" type="number" min={1} max={40} defaultValue={10} />
                      </label>
                      <label>
                        Vitesse
                        <input name="speed" type="number" min={0} max={200} defaultValue={30} />
                      </label>
                    </div>
                    <div className="ability-grid" aria-label="Caracteristiques">
                      {(["str", "dex", "con", "int", "wis", "cha"] as const).map((ability) => (
                        <label key={ability}>
                          {ability.toUpperCase()}
                          <input name={ability} type="number" min={1} max={30} defaultValue={10} />
                        </label>
                      ))}
                    </div>
                    <label>
                      Notes
                      <textarea name="notes" rows={3} maxLength={4000} />
                    </label>
                    <button className="primary-button" disabled={isBusy} type="submit">
                      <Plus aria-hidden="true" />
                      Ajouter la fiche
                    </button>
                  </form>

                  <div className="character-layout">
                    <div className="character-list">
                      {characters.length === 0 ? (
                        <div className="empty-state compact-empty">
                          <ScrollText aria-hidden="true" />
                          <p>Aucune fiche dans cette campagne.</p>
                        </div>
                      ) : (
                        characters.map((character) => (
                          <button
                            className={`character-row ${selectedCharacter?.id === character.id ? "selected" : ""}`}
                            key={character.id}
                            onClick={() => setSelectedCharacterId(character.id)}
                            type="button"
                          >
                            <span>
                              <strong>{character.name}</strong>
                              <small>
                                Niv. {character.level} {character.class_name || "Aventurier"}
                              </small>
                            </span>
                            <em>{character.hp_current}/{character.hp_max} PV</em>
                          </button>
                        ))
                      )}
                    </div>

                    {selectedCharacter && (
                      <article className="sheet-preview">
                        <div className="sheet-title">
                          <div>
                            <h4>{selectedCharacter.name}</h4>
                            <p>
                              {selectedCharacter.ancestry || "Origine libre"} ·{" "}
                              {selectedCharacter.class_name || "Classe libre"} · niveau {selectedCharacter.level}
                            </p>
                          </div>
                          <HeartPulse aria-hidden="true" />
                        </div>
                        <div className="stat-strip">
                          <span>CA {selectedCharacter.armor_class}</span>
                          <span>PV {selectedCharacter.hp_current}/{selectedCharacter.hp_max}</span>
                          <span>VIT {selectedCharacter.speed}</span>
                          <span>PB +{selectedCharacter.proficiency_bonus}</span>
                        </div>
                        <div className="ability-summary">
                          {Object.entries(selectedCharacter.attributes).map(([key, value]) => (
                            <span key={key}>
                              <strong>{key.toUpperCase()}</strong>
                              {value}
                            </span>
                          ))}
                        </div>
                        {selectedCharacter.notes && <p className="sheet-notes">{selectedCharacter.notes}</p>}
                      </article>
                    )}
                  </div>
                </div>

                <div className="session-section">
                  <div className="section-heading">
                    <h3>Des & journal</h3>
                    <Dices aria-hidden="true" />
                  </div>
                  <div className="session-layout">
                    <form className="roll-form" onSubmit={handleRoll}>
                      <label>
                        Formule
                        <input name="formula" placeholder="1d20+5" required />
                      </label>
                      <label>
                        Libelle
                        <input name="label" maxLength={120} placeholder="Attaque, perception..." />
                      </label>
                      <div className="mini-grid three">
                        <label>
                          Mode
                          <select name="mode" defaultValue="normal">
                            <option value="normal">Normal</option>
                            <option value="advantage">Avantage</option>
                            <option value="disadvantage">Desavantage</option>
                          </select>
                        </label>
                        <label>
                          Visibilite
                          <select name="visibility" defaultValue="public">
                            <option value="public">Public</option>
                            <option value="gm">MJ</option>
                          </select>
                        </label>
                        <label>
                          Personnage
                          <select name="character_id" defaultValue={selectedCharacter?.id ?? ""}>
                            <option value="">Sans fiche</option>
                            {characters.map((character) => (
                              <option key={character.id} value={character.id}>
                                {character.name}
                              </option>
                            ))}
                          </select>
                        </label>
                      </div>
                      <button className="primary-button" disabled={isBusy} type="submit">
                        <Dices aria-hidden="true" />
                        Lancer
                      </button>
                    </form>

                    <form className="log-note-form" onSubmit={handleLogNote}>
                      <label>
                        Note de session
                        <textarea name="message" rows={3} maxLength={2000} required />
                      </label>
                      <label>
                        Visibilite
                        <select name="visibility" defaultValue="public">
                          <option value="public">Public</option>
                          <option value="gm">MJ</option>
                        </select>
                      </label>
                      <button className="ghost-button" disabled={isBusy} type="submit">
                        Ajouter au journal
                      </button>
                    </form>
                  </div>

                  <div className="roll-log-layout">
                    <section className="log-panel">
                      <h4>Derniers jets</h4>
                      {rolls.length === 0 ? (
                        <p className="muted">Aucun jet pour cette campagne.</p>
                      ) : (
                        rolls.slice(0, 8).map((roll) => (
                          <article className="roll-row" key={roll.id}>
                            <span>
                              <strong>{roll.label || roll.formula}</strong>
                              <small>
                                {roll.formula} - {roll.mode} - {roll.visibility}
                              </small>
                            </span>
                            <em>{roll.total}</em>
                          </article>
                        ))
                      )}
                    </section>
                    <section className="log-panel">
                      <h4>Journal</h4>
                      {logEntries.length === 0 ? (
                        <p className="muted">Le journal est vide.</p>
                      ) : (
                        logEntries.slice(0, 10).map((entry) => (
                          <article className={`log-row ${entry.entry_type}`} key={entry.id}>
                            <span>{entry.message}</span>
                            <small>{entry.visibility}</small>
                          </article>
                        ))
                      )}
                    </section>
                  </div>
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
