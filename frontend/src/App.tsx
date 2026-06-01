import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  DoorOpen,
  Plus,
  Swords,
  UserPlus,
} from "lucide-react";
import "./styles.css";
import type { CampaignView } from "./components/CampaignViewTabs";
import { SESSION_LIVE_MODES, type SessionLiveMode } from "./config/sessionLiveModes";
import { CampaignMap } from "./components/CampaignMap";
import { AuthPage } from "./components/AuthPage";
import { EditCharacterSheet } from "./components/EditCharacterSheet";
import { GmCharacterInspector } from "./components/GmCharacterInspector";
import { HandoutPanel } from "./components/HandoutPanel";
import { HomebrewPanel } from "./components/HomebrewPanel";
import { GmMessagePanel } from "./components/GmMessagePanel";
import { InvitePage } from "./components/InvitePage";
import { PlayerView } from "./components/PlayerView";
import { GmLobby } from "./components/GmLobby";
import { PlayerLobby } from "./components/PlayerLobby";
import { SessionLogPanel } from "./components/SessionLogPanel";
import { MessageDock } from "./components/common";
import type {
  Asset,
  AuthResponse,
  Campaign,
  Character,
  Combatant,
  Encounter,
  EncounterDetail,
  GameLogEntry,
  Handout,
  Invite,
  Member,
  Roll,
  Scene,
  SceneToken,
  User,
} from "./api/types";

const API_BASE = "";
const TOKEN_STORAGE_KEY = "dnd_access_token";

export default function App() {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_STORAGE_KEY) ?? "");
  const [user, setUser] = useState<User | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>("");
  const [members, setMembers] = useState<Member[]>([]);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [selectedCharacterId, setSelectedCharacterId] = useState<string>("");
  const [inspectedCharacterId, setInspectedCharacterId] = useState<string>("");
  const [rolls, setRolls] = useState<Roll[]>([]);
  const [logEntries, setLogEntries] = useState<GameLogEntry[]>([]);
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [selectedSceneId, setSelectedSceneId] = useState<string>("");
  const [sceneTokens, setSceneTokens] = useState<SceneToken[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [selectedAssetId, setSelectedAssetId] = useState<string>("");
  const [sceneBackgroundObjectUrl, setSceneBackgroundObjectUrl] = useState<string>("");
  const [encounters, setEncounters] = useState<Encounter[]>([]);
  const [selectedEncounterId, setSelectedEncounterId] = useState<string>("");
  const [combatants, setCombatants] = useState<Combatant[]>([]);
  const [handouts, setHandouts] = useState<Handout[]>([]);
  const [presenceCount, setPresenceCount] = useState(0);
  const [realtimeStatus, setRealtimeStatus] = useState<"offline" | "connecting" | "online">("offline");
  const [latestInvite, setLatestInvite] = useState<Invite | null>(null);
  const [message, setMessage] = useState("");
  const [inviteToken, setInviteToken] = useState<string | null>(() => {
    const match = window.location.pathname.match(/^\/invite\/([\\w-]+)/);
    return match ? match[1] : null;
  });
  const [activeSessionLiveMode, setActiveSessionLiveMode] = useState<SessionLiveMode>("exploration");
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

  const selectedScene = useMemo(
    () => scenes.find((scene) => scene.id === selectedSceneId) ?? scenes[0],
    [scenes, selectedSceneId],
  );

  const selectedEncounter = useMemo(
    () => encounters.find((encounter) => encounter.id === selectedEncounterId) ?? encounters[0],
    [encounters, selectedEncounterId],
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
    void loadVttState(selectedCampaign.id);
    void loadAssets(selectedCampaign.id);
    void loadCombatState(selectedCampaign.id);
    void loadHandouts(selectedCampaign.id);
  }, [selectedCampaign?.id]);

  useEffect(() => {
    if (!selectedScene?.background_url || !token) {
      setSceneBackgroundObjectUrl("");
      return;
    }

    let isCancelled = false;
    let objectUrl = "";

    async function loadSceneBackground() {
      const response = await fetch(selectedScene.background_url!, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error("Unable to load scene background");
      }

      const blob = await response.blob();
      objectUrl = URL.createObjectURL(blob);

      if (!isCancelled) {
        setSceneBackgroundObjectUrl(objectUrl);
      }
    }

    void loadSceneBackground().catch(() => {
      if (!isCancelled) {
        setSceneBackgroundObjectUrl("");
      }
    });

    return () => {
      isCancelled = true;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [selectedScene?.background_url, token]);

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
        if (payload.resource === "scene" || payload.resource === "token") {
          void loadVttState(selectedCampaign.id);
        }
        if (payload.resource === "encounter") {
          void loadCombatState(selectedCampaign.id);
        }
        if (payload.resource === "handout") {
          void loadHandouts(selectedCampaign.id);
        }
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

    if (response.status === 204) {
      return undefined as T;
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

  async function loadSceneTokens(sceneId: string) {
    try {
      setSceneTokens(await request<SceneToken[]>(`/api/scenes/${sceneId}/tokens`));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to load scene tokens");
    }
  }

  async function loadVttState(campaignId: string) {
    try {
      const data = await request<Scene[]>(`/api/campaigns/${campaignId}/scenes`);
      setScenes(data);

      if (data.length === 0) {
        setSelectedSceneId("");
        setSceneTokens([]);
        return;
      }

      const effectiveScene = data.find((scene) => scene.id === selectedSceneId) ?? data[0];
      setSelectedSceneId(effectiveScene.id);
      await loadSceneTokens(effectiveScene.id);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to load VTT scene");
    }
  }


  async function handleMoveToken(tokenToMove: SceneToken, dx: number, dy: number) {
    setIsBusy(true);
    setMessage("");

    try {
      const updated = await request<SceneToken>(`/api/tokens/${tokenToMove.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          x: Math.max(0, tokenToMove.x + dx),
          y: Math.max(0, tokenToMove.y + dy),
        }),
      });

      setSceneTokens((current) =>
        current.map((item) => (item.id === updated.id ? updated : item)),
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to move token");
    } finally {
      setIsBusy(false);
    }
  }

  function updateEncounterFromDetail(detail: EncounterDetail) {
    setEncounters((current) => {
      const summary: Encounter = {
        id: detail.id,
        campaign_id: detail.campaign_id,
        scene_id: detail.scene_id,
        name: detail.name,
        status: detail.status,
        round_number: detail.round_number,
        turn_index: detail.turn_index,
        active_combatant_id: detail.active_combatant_id,
        created_at: detail.created_at,
        updated_at: detail.updated_at,
      };

      if (current.some((item) => item.id === detail.id)) {
        return current.map((item) => (item.id === detail.id ? summary : item));
      }

      return [summary, ...current];
    });

    setCombatants(detail.combatants);
  }

  async function loadEncounterDetail(encounterId: string) {
    try {
      const detail = await request<EncounterDetail>(`/api/encounters/${encounterId}`);
      updateEncounterFromDetail(detail);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to load encounter");
    }
  }

  async function loadCombatState(campaignId: string) {
    try {
      const data = await request<Encounter[]>(`/api/campaigns/${campaignId}/encounters`);
      setEncounters(data);

      if (data.length === 0) {
        setSelectedEncounterId("");
        setCombatants([]);
        return;
      }

      const effectiveEncounter = data.find((encounter) => encounter.id === selectedEncounterId) ?? data[0];
      setSelectedEncounterId(effectiveEncounter.id);
      await loadEncounterDetail(effectiveEncounter.id);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to load combat state");
    }
  }

  async function loadHandouts(campaignId: string) {
    try {
      setHandouts(await request<Handout[]>(`/api/campaigns/${campaignId}/handouts`));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to load handouts");
    }
  }


  async function handleCreateHandout(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedCampaign) {
      return;
    }

    setIsBusy(true);
    setMessage("");

    const form = new FormData(event.currentTarget);
    const sceneId = String(form.get("scene_id") || "");

    try {
      const handout = await request<Handout>(`/api/campaigns/${selectedCampaign.id}/handouts`, {
        method: "POST",
        body: JSON.stringify({
          title: String(form.get("title")),
          content: String(form.get("content") || ""),
          visibility: String(form.get("visibility") || "gm"),
          scene_id: sceneId || null,
        }),
      });

      setHandouts((current) => [handout, ...current]);
      event.currentTarget.reset();
      setMessage("Handout cree.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to create handout");
    } finally {
      setIsBusy(false);
    }
  }

  async function handleRevealHandout(handout: Handout) {
    setIsBusy(true);
    setMessage("");

    try {
      const updated = await request<Handout>(`/api/handouts/${handout.id}`, {
        method: "PATCH",
        body: JSON.stringify({ is_revealed: true }),
      });

      setHandouts((current) =>
        current.map((item) => (item.id === updated.id ? updated : item)),
      );
      setMessage(`Handout "${updated.title}" partage aux joueurs.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to reveal handout");
    } finally {
      setIsBusy(false);
    }
  }

  async function handleDeleteHandout(handout: Handout) {
    if (!confirm(`Supprimer le handout "${handout.title}" ?`)) {
      return;
    }

    setIsBusy(true);
    setMessage("");

    try {
      await request<void>(`/api/handouts/${handout.id}`, { method: "DELETE" });
      setHandouts((current) => current.filter((item) => item.id !== handout.id));
      setMessage("Handout supprime.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to delete handout");
    } finally {
      setIsBusy(false);
    }
  }


  async function loadAssets(campaignId: string) {
    try {
      const data = await request<Asset[]>(`/api/campaigns/${campaignId}/assets`);
      setAssets(data);
      setSelectedAssetId((current) => current || data[0]?.id || "");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to load assets");
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

  // ── Routing ──────────────────────────────────────────────────

  // 1. Invite link + already logged in → join flow
  if (inviteToken && user) {
    return (
      <InvitePage
        inviteToken={inviteToken}
        token={token}
        userDisplayName={user.display_name}
        onTokenChange={(newToken) => {
          localStorage.setItem(TOKEN_STORAGE_KEY, newToken);
          setToken(newToken);
        }}
        onJoined={() => {
          const activeToken = localStorage.getItem(TOKEN_STORAGE_KEY) || token;
          void loadCampaigns(activeToken).then(() => {
            setInviteToken(null);
            if (window.history.pushState) {
              window.history.pushState({}, "", "/");
            }
          });
        }}
      />
    );
  }

  // 2. Invite link + not authenticated → AuthPage with invite context
  if (inviteToken && !user) {
    return (
      <AuthPage
        inviteToken={inviteToken}
        isBusy={isBusy}
        message={message}
        onSubmit={async (payload) => {
          setIsBusy(true);
          setMessage("");
          try {
            const auth = await request<AuthResponse>(`/api/auth/${payload.mode}`, {
              method: "POST",
              body: JSON.stringify(payload),
            });
            localStorage.setItem(TOKEN_STORAGE_KEY, auth.access_token);
            setToken(auth.access_token);
            setUser(auth.user);
            await loadCampaigns(auth.access_token);
            if (payload.mode === "register") {
              setInviteToken(null);
              window.history.pushState({}, "", "/");
            }
          } catch (err) {
            setMessage(err instanceof Error ? err.message : "Échec");
          } finally {
            setIsBusy(false);
          }
        }}
      />
    );
  }

  // 3. Not authenticated → unified AuthPage
  if (!user) {
    return (
      <AuthPage
        inviteToken={null}
        isBusy={isBusy}
        message={message}
        onSubmit={async (payload) => {
          setIsBusy(true);
          setMessage("");
          try {
            const auth = await request<AuthResponse>(`/api/auth/${payload.mode}`, {
              method: "POST",
              body: JSON.stringify(payload),
            });
            localStorage.setItem(TOKEN_STORAGE_KEY, auth.access_token);
            setToken(auth.access_token);
            setUser(auth.user);
            await loadCampaigns(auth.access_token);
          } catch (err) {
            setMessage(err instanceof Error ? err.message : "Échec");
          } finally {
            setIsBusy(false);
          }
        }}
      />
    );
  }

  // 4. Player — no campaign → PlayerLobby
  if (user.account_type === "player" && campaigns.length === 0) {
    return (
      <PlayerLobby
        token={token}
        userDisplayName={user.display_name}
        onLogout={logout}
        onJoined={() => {
          void loadCampaigns(token);
        }}
      />
    );
  }

  // 5. Player — has campaign → PlayerView
  if (selectedCampaign && selectedCampaign.role === "player") {
    return (
      <PlayerView
        campaign={selectedCampaign}
        token={token}
        userId={user.id}
        userDisplayName={user.display_name}
        presenceCount={presenceCount}
        onLogout={logout}
      />
    );
  }

  // 6. GM — no campaign → GmLobby
  if (user.account_type === "gm" && campaigns.length === 0) {
    return (
      <GmLobby
        token={token}
        userDisplayName={user.display_name}
        isBusy={isBusy}
        message={message}
        onCreateCampaign={handleCreateCampaign}
        onLogout={logout}
      />
    );
  }

  // 7. GM — has campaign → full VTT interface
  //     Layout: sidebar | CampaignMap | panels

  return (
    <main className="gm-campaign-shell">
      {/* ── Sidebar ─────────────────────────────────────────── */}
      <aside className="gm-sidebar">
        <div className="brand-mark compact">
          <Swords aria-hidden="true" />
          DnD
        </div>

        <div className="gm-campaign-list">
          <h4>Mes tables</h4>
          {campaigns.map((c) => (
            <button
              className={`gm-campaign-item ${selectedCampaign?.id === c.id ? "selected" : ""}`}
              key={c.id}
              onClick={() => {
                setSelectedCampaignId(c.id);
                setLatestInvite(null);
              }}
              type="button"
            >
              <strong>{c.name}</strong>
              <small>{c.member_count} membres</small>
            </button>
          ))}
        </div>

        <div className="gm-members-list">
          <h4>Membres</h4>
          {members.map((m) => (
            <div className="gm-member-row" key={m.user_id}>
              <span>{m.display_name}</span>
              <small>{m.role}</small>
            </div>
          ))}
        </div>

        <div className="gm-sidebar-actions">
          <button className="primary-button compact" disabled={isBusy} onClick={handleCreateInvite} type="button">
            <UserPlus aria-hidden="true" size={14} />
            Inviter
          </button>
          <button className="ghost-button compact" onClick={logout} type="button">
            <DoorOpen aria-hidden="true" size={14} />
            Sortir
          </button>
        </div>
      </aside>

      {/* ── Centre — Carte ──────────────────────────────────── */}
      <section className="gm-map-area">
        <div className="gm-map-topbar">
          <div>
            <span className="realtime-pill">{realtimeStatus}</span>
            <span>{presenceCount} connectés</span>
          </div>
          <span className="gm-campaign-name">{selectedCampaign?.name ?? "Campagne"}</span>
          <div className="session-live-mode-buttons compact" aria-label="Modes">
            {SESSION_LIVE_MODES.map((m) => (
              <button
                key={m.id}
                className={activeSessionLiveMode === m.id ? "active" : ""}
                onClick={() => setActiveSessionLiveMode(m.id)}
                type="button"
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        <CampaignMap
          isGM={true}
          wsRef={wsRef}
          userId={user?.id}
          campaignId={selectedCampaign?.id ?? ""}
          token={token}
          scenes={scenes}
          selectedScene={selectedScene}
          selectedSceneId={selectedSceneId}
          sceneTokens={sceneTokens}
          sceneBackgroundObjectUrl={sceneBackgroundObjectUrl}
          characters={characters}
          onSelectScene={setSelectedSceneId}
          onLoadSceneTokens={(id) => void loadSceneTokens(id)}
          onMoveToken={(t, dx, dy) => void handleMoveToken(t, dx, dy)}
        />
      </section>

      {/* ── Droite — Panneaux ───────────────────────────────── */}
      <aside className="gm-panels">
        {/* Characters panel */}
        <details className="gm-panel-section" open>
          <summary>👤 Personnages</summary>
          <div className="character-section" data-campaign-tab="characters">
            <form className="character-form" onSubmit={handleCreateCharacter}>
              <label><input name="name" minLength={2} maxLength={120} required placeholder="Nom du personnage" /></label>
              <div className="mini-grid">
                <label><input name="ancestry" maxLength={80} placeholder="Origine" /></label>
                <label><input name="class_name" maxLength={80} placeholder="Classe" /></label>
              </div>
              <div className="mini-grid">
                <label><input name="level" type="number" min={1} max={20} defaultValue={1} placeholder="Niv." /></label>
                <label><input name="hp_max" type="number" min={1} defaultValue={10} placeholder="PV" /></label>
                <label><input name="armor_class" type="number" min={1} max={40} defaultValue={10} placeholder="CA" /></label>
                <label><input name="speed" type="number" min={0} max={200} defaultValue={30} placeholder="Vit." /></label>
              </div>
              <button className="primary-button compact" disabled={isBusy} type="submit">
                <Plus aria-hidden="true" size={12} /> Ajouter
              </button>
            </form>

            <div className="character-list">
              {characters.map((ch) => (
                <div
                  className={`character-row ${selectedCharacter?.id === ch.id ? "selected" : ""}`}
                  key={ch.id}
                >
                  <button
                    className="character-row-btn"
                    onClick={() => setSelectedCharacterId(ch.id)}
                    type="button"
                  >
                    <span><strong>{ch.name}</strong><small>Niv.{ch.level} {ch.class_name}</small></span>
                    <em>{ch.hp_current}/{ch.hp_max} PV</em>
                  </button>
                  <button
                    className="character-inspect-btn"
                    onClick={() => setInspectedCharacterId(ch.id)}
                    title="Gérer (PV, XP, équipement, conditions)"
                    type="button"
                  >
                    🔍
                  </button>
                </div>
              ))}
            </div>

            {selectedCharacter && (
              <EditCharacterSheet
                character={selectedCharacter}
                token={token}
                isBusy={isBusy}
                onSave={(updated) => setCharacters((c) => c.map((x) => (x.id === updated.id ? updated : x)))}
              />
            )}
          </div>
        </details>

        {/* Combat — quick state */}
        <details className="gm-panel-section">
          <summary>⚔️ Combat</summary>
          <p className="muted">Gestion du combat — via VttBoard en mode avancé.</p>
        </details>

        {/* Session Log */}
        <details className="gm-panel-section">
          <summary>📋 Journal</summary>
          <SessionLogPanel
            characters={characters}
            selectedCharacter={selectedCharacter}
            rolls={rolls}
            logEntries={logEntries}
            isBusy={isBusy}
            token={token}
            onRoll={handleRoll}
            onAddNote={handleLogNote}
            onRefresh={(category?) => {
              if (selectedCampaign) {
                void (async () => {
                  try {
                    const url = category
                      ? `/api/campaigns/${selectedCampaign.id}/log?limit=100&category=${category}`
                      : `/api/campaigns/${selectedCampaign.id}/log?limit=100`;
                    const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
                    if (response.ok) setLogEntries(await response.json());
                  } catch { /* ignore */ }
                })();
              }
            }}
          />
        </details>

        {/* Handouts */}
        <details className="gm-panel-section">
          <summary>📄 Documents</summary>
          <HandoutPanel
            handouts={handouts}
            scenes={scenes}
            isBusy={isBusy}
            onCreateHandout={handleCreateHandout}
            onRevealHandout={(h) => void handleRevealHandout(h)}
            onDeleteHandout={(h) => void handleDeleteHandout(h)}
          />
        </details>

        {/* Homebrew */}
        <details className="gm-panel-section">
          <summary>📚 Bibliothèque</summary>
          <HomebrewPanel
            campaignId={selectedCampaign?.id ?? ""}
            token={token}
            scenes={scenes}
            encounters={encounters}
            isBusy={isBusy}
          />
        </details>

        {/* Messages MJ → Joueurs */}
        <details className="gm-panel-section">
          <summary>💬 Communication</summary>
          <GmMessagePanel
            campaignId={selectedCampaign?.id ?? ""}
            token={token}
            members={members}
          />
        </details>
      </aside>

      <MessageDock message={message} />

      {/* ── Character Inspector Modal ─────────────────────────── */}
      {inspectedCharacterId && (() => {
        const char = characters.find((c) => c.id === inspectedCharacterId);
        if (!char) return null;
        return (
          <GmCharacterInspector
            character={char}
            token={token}
            onClose={() => setInspectedCharacterId("")}
            onCharacterUpdated={(updated) =>
              setCharacters((c) => c.map((x) => (x.id === updated.id ? updated : x)))
            }
          />
        );
      })()}
    </main>
  );
}
