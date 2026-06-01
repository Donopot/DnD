import React, { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  Castle,
  Copy,
  DoorOpen,
  HeartPulse,
  Plus,
  RefreshCw,
  Shield,
  ScrollText,
  Swords,
  UserPlus,
} from "lucide-react";
import "./styles.css";
import { CampaignViewTabs } from "./components/CampaignViewTabs";
import type { CampaignView } from "./components/CampaignViewTabs";
import { SESSION_LIVE_MODES, type SessionLiveMode } from "./config/sessionLiveModes";
import { AuthView } from "./components/AuthView";
import { EditCharacterSheet } from "./components/EditCharacterSheet";
import { HandoutPanel } from "./components/HandoutPanel";
import { InvitePage } from "./components/InvitePage";
import { PlayerView } from "./components/PlayerView";
import { SessionLogPanel } from "./components/SessionLogPanel";
import { VttBoard } from "./components/VttBoard";
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
  const [mode, setMode] = useState<"login" | "register">("register");
  const [message, setMessage] = useState("");
  const [inviteToken, setInviteToken] = useState<string | null>(() => {
    const match = window.location.pathname.match(/^\/invite\/([\\w-]+)/);
    return match ? match[1] : null;
  });
  const [activeCampaignView, setActiveCampaignView] = useState<CampaignView>("campaign");
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

  const activeSessionLiveModeDetail = useMemo(
    () => SESSION_LIVE_MODES.find((mode) => mode.id === activeSessionLiveMode) ?? SESSION_LIVE_MODES[0],
    [activeSessionLiveMode],
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

  async function handleCreateScene(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedCampaign) {
      return;
    }

    setIsBusy(true);
    setMessage("");

    const form = new FormData(event.currentTarget);

    try {
      const scene = await request<Scene>(`/api/campaigns/${selectedCampaign.id}/scenes`, {
        method: "POST",
        body: JSON.stringify({
          name: String(form.get("name")),
          description: String(form.get("description")),
          grid_size: Number(form.get("grid_size") || 50),
          width: Number(form.get("width") || 1200),
          height: Number(form.get("height") || 800),
          is_active: true,
        }),
      });

      setScenes((current) => [scene, ...current]);
      setSelectedSceneId(scene.id);
      setSceneTokens([]);
      event.currentTarget.reset();
      setMessage("Scene creee.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to create scene");
    } finally {
      setIsBusy(false);
    }
  }

  async function handleCreateToken(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedScene) {
      return;
    }

    setIsBusy(true);
    setMessage("");

    const form = new FormData(event.currentTarget);
    const characterId = String(form.get("character_id") || "");
    const character = characters.find((item) => item.id === characterId);

    try {
      const token = await request<SceneToken>(`/api/scenes/${selectedScene.id}/tokens`, {
        method: "POST",
        body: JSON.stringify({
          character_id: characterId || null,
          name: String(form.get("name") || character?.name || "Token"),
          x: Number(form.get("x") || 0),
          y: Number(form.get("y") || 0),
          size: Number(form.get("size") || 1),
          color: String(form.get("color") || "#7c3aed"),
        }),
      });

      setSceneTokens((current) => [...current, token]);
      event.currentTarget.reset();
      setMessage("Token ajoute.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to create token");
    } finally {
      setIsBusy(false);
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

  async function handleCreateEncounter(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedCampaign) {
      return;
    }

    setIsBusy(true);
    setMessage("");

    const form = new FormData(event.currentTarget);

    try {
      const encounter = await request<Encounter>(`/api/campaigns/${selectedCampaign.id}/encounters`, {
        method: "POST",
        body: JSON.stringify({
          name: String(form.get("name")),
          scene_id: selectedScene?.id ?? null,
        }),
      });

      setEncounters((current) => [encounter, ...current]);
      setSelectedEncounterId(encounter.id);
      setCombatants([]);
      event.currentTarget.reset();
      setMessage("Combat cree.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to create encounter");
    } finally {
      setIsBusy(false);
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

  async function handleAddCombatant(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedEncounter) {
      return;
    }

    setIsBusy(true);
    setMessage("");

    const form = new FormData(event.currentTarget);
    const characterId = String(form.get("character_id") || "");
    const tokenId = String(form.get("token_id") || "");
    const character = characters.find((item) => item.id === characterId);
    const tokenItem = sceneTokens.find((item) => item.id === tokenId);

    try {
      await request<Combatant>(`/api/encounters/${selectedEncounter.id}/combatants`, {
        method: "POST",
        body: JSON.stringify({
          token_id: tokenId || null,
          character_id: characterId || null,
          name: String(form.get("name") || character?.name || tokenItem?.name || "Combattant"),
          initiative: Number(form.get("initiative") || 0),
          armor_class: Number(form.get("armor_class") || character?.armor_class || 10),
          hp_current: Number(form.get("hp_current") || character?.hp_current || 1),
          hp_max: Number(form.get("hp_max") || character?.hp_max || 1),
          is_player_controlled: Boolean(characterId),
          is_hidden: false,
        }),
      });

      event.currentTarget.reset();
      await loadEncounterDetail(selectedEncounter.id);
      setMessage("Combattant ajoute.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to add combatant");
    } finally {
      setIsBusy(false);
    }
  }

  async function handleStartEncounter() {
    if (!selectedEncounter) {
      return;
    }

    setIsBusy(true);
    setMessage("");

    try {
      const detail = await request<EncounterDetail>(`/api/encounters/${selectedEncounter.id}/start`, {
        method: "POST",
      });
      updateEncounterFromDetail(detail);
      setMessage("Combat demarre.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to start encounter");
    } finally {
      setIsBusy(false);
    }
  }

  async function handleNextTurn() {
    if (!selectedEncounter) {
      return;
    }

    setIsBusy(true);
    setMessage("");

    try {
      const detail = await request<EncounterDetail>(`/api/encounters/${selectedEncounter.id}/next-turn`, {
        method: "POST",
      });
      updateEncounterFromDetail(detail);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to advance turn");
    } finally {
      setIsBusy(false);
    }
  }

  async function handleEndEncounter() {
    if (!selectedEncounter) {
      return;
    }

    setIsBusy(true);
    setMessage("");

    try {
      const detail = await request<EncounterDetail>(`/api/encounters/${selectedEncounter.id}/end`, {
        method: "POST",
      });
      updateEncounterFromDetail(detail);
      setMessage("Combat termine.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to end encounter");
    } finally {
      setIsBusy(false);
    }
  }

  async function handleAdjustCombatantHp(combatant: Combatant, delta: number) {
    const currentHp = combatant.hp_current ?? 0;

    try {
      const updated = await request<Combatant>(`/api/combatants/${combatant.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          hp_current: Math.max(0, currentHp + delta),
        }),
      });

      setCombatants((current) => current.map((item) => (item.id === updated.id ? updated : item)));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to update HP");
    }
  }

  async function handleToggleDefeated(combatant: Combatant) {
    try {
      const updated = await request<Combatant>(`/api/combatants/${combatant.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          is_defeated: !combatant.is_defeated,
        }),
      });

      setCombatants((current) => current.map((item) => (item.id === updated.id ? updated : item)));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to update combatant");
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

  async function handleUploadAsset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedCampaign) {
      return;
    }

    setIsBusy(true);
    setMessage("");

    const form = new FormData(event.currentTarget);
    const upload = new FormData();
    const file = form.get("file");

    if (!(file instanceof File) || file.size === 0) {
      setMessage("Selectionne une image de carte.");
      setIsBusy(false);
      return;
    }

    upload.append("file", file);

    try {
      const response = await fetch(`/api/campaigns/${selectedCampaign.id}/assets`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: upload,
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({ detail: "Unable to upload asset" }));
        throw new Error(body.detail ?? "Unable to upload asset");
      }

      const asset = (await response.json()) as Asset;
      setAssets((current) => [asset, ...current]);
      setSelectedAssetId(asset.id);
      event.currentTarget.reset();
      setMessage("Carte uploadee.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to upload asset");
    } finally {
      setIsBusy(false);
    }
  }

  async function handleSetSceneBackground() {
    if (!selectedScene) {
      return;
    }

    setIsBusy(true);
    setMessage("");

    try {
      const scene = await request<Scene>(`/api/scenes/${selectedScene.id}/background`, {
        method: "PATCH",
        body: JSON.stringify({
          asset_id: selectedAssetId || null,
        }),
      });

      setScenes((current) => current.map((item) => (item.id === scene.id ? scene : item)));
      setSelectedSceneId(scene.id);
      setMessage("Fond de scene mis a jour.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to set scene background");
    } finally {
      setIsBusy(false);
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

  if (inviteToken) {
    return (
      <InvitePage
        inviteToken={inviteToken}
        token={token}
        userDisplayName={user?.display_name ?? null}
        onTokenChange={(newToken) => {
          localStorage.setItem(TOKEN_STORAGE_KEY, newToken);
          setToken(newToken);
        }}
        onJoined={() => {
          void loadCampaigns(token).then(() => {
            // After joining, go to main view
            if (window.history.pushState) {
              window.history.pushState({}, "", "/");
            }
          });
        }}
      />
    );
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

        <AuthView
          mode={mode}
          isBusy={isBusy}
          onModeChange={setMode}
          onSubmit={handleAuth}
        />
      </main>
    );
  }

  // Player role → show player dashboard instead of GM interface
  if (selectedCampaign && selectedCampaign.role === "player") {
    return (
      <PlayerView
        campaign={selectedCampaign}
        token={token}
        userDisplayName={user.display_name}
        presenceCount={presenceCount}
        onLogout={logout}
      />
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

          <section className={`panel detail-panel campaign-view-${activeCampaignView}`}>
            <h2>{selectedCampaign?.name ?? "Selection"}</h2>
            {selectedCampaign ? (
              <>
                <CampaignViewTabs activeView={activeCampaignView} onChange={setActiveCampaignView} />


                <section className="campaign-overview-tab" data-campaign-tab="overview">
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
                </section>

                <div className="character-section" data-campaign-tab="characters">
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
                      <EditCharacterSheet
                        character={selectedCharacter}
                        token={token}
                        isBusy={isBusy}
                        onSave={(updated) => {
                          setCharacters((current) =>
                            current.map((c) => (c.id === updated.id ? updated : c)),
                          );
                        }}
                      />
                    )}
                  </div>
                </div>

                <section className="session-live-mode-bar">
                  <div>
                    <span className="session-status">Session Live</span>
                    <h3>Mode {activeSessionLiveModeDetail.label}</h3>
                    <p>{activeSessionLiveModeDetail.description}</p>
                  </div>

                  <div className="session-live-mode-buttons" aria-label="Modes Session Live">
                    {SESSION_LIVE_MODES.map((mode) => (
                      <button
                        className={activeSessionLiveMode === mode.id ? "active" : ""}
                        key={mode.id}
                        onClick={() => setActiveSessionLiveMode(mode.id)}
                        type="button"
                      >
                        <strong>{mode.label}</strong>
                        <small>{mode.description}</small>
                      </button>
                    ))}
                  </div>
                </section>

                {activeCampaignView === "live" || activeCampaignView === "preparation" ? (
                <VttBoard
                  campaignId={selectedCampaign?.id ?? ""}
                  scenes={scenes}
                  selectedScene={selectedScene}
                  selectedSceneId={selectedSceneId}
                  sceneTokens={sceneTokens}
                  characters={characters}
                  selectedCharacter={selectedCharacter}
                  assets={assets}
                  selectedAssetId={selectedAssetId}
                  sceneBackgroundObjectUrl={sceneBackgroundObjectUrl}
                  isBusy={isBusy}
                  onSelectScene={setSelectedSceneId}
                  onLoadSceneTokens={(sceneId) => void loadSceneTokens(sceneId)}
                  onCreateScene={handleCreateScene}
                  onUploadAsset={handleUploadAsset}
                  onSelectAsset={setSelectedAssetId}
                  onSetSceneBackground={() => void handleSetSceneBackground()}
                  onCreateToken={handleCreateToken}
                  onMoveToken={(tokenToMove, dx, dy) => void handleMoveToken(tokenToMove, dx, dy)}
                  sessionLiveMode={activeCampaignView === "live" ? activeSessionLiveMode : undefined}
                />
                ) : null}

                <SessionLogPanel
                  characters={characters}
                  selectedCharacter={selectedCharacter}
                  rolls={rolls}
                  logEntries={logEntries}
                  isBusy={isBusy}
                  onRoll={handleRoll}
                  onAddNote={handleLogNote}
                />

                <HandoutPanel
                  handouts={handouts}
                  scenes={scenes}
                  isBusy={isBusy}
                  onCreateHandout={handleCreateHandout}
                  onRevealHandout={(handout) => void handleRevealHandout(handout)}
                  onDeleteHandout={(handout) => void handleDeleteHandout(handout)}
                />

                <section className="gm-placeholder-tab gm-settings-placeholder">
                  <h3>Parametres</h3>
                  <p className="muted">Espace prevu pour la configuration de campagne et de session.</p>
                  <ul>
                    <li>Permissions joueurs</li>
                    <li>Systeme de jeu</li>
                    <li>Options de visibilite</li>
                    <li>Layouts, raccourcis et import/export</li>
                  </ul>
                </section>
              </>
            ) : (
              <p className="muted">Cree ou selectionne une campagne.</p>
            )}
          </section>
        </div>
        <MessageDock message={message} />
      </section>
    </main>
  );
}
