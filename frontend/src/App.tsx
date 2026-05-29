import React, { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  Castle,
  Copy,
  Dices,
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
import { AuthView } from "./components/AuthView";
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

                <div className="vtt-section">
                  <div className="section-heading">
                    <h3>Table virtuelle</h3>
                    <Swords aria-hidden="true" />
                  </div>

                  <div className="vtt-layout">
                    <section className="vtt-board-panel">
                      <div className="vtt-toolbar">
                        <div>
                          <strong>{selectedScene?.name ?? "Aucune scene"}</strong>
                          {selectedScene && (
                            <small>
                              {selectedScene.width} x {selectedScene.height} - grille {selectedScene.grid_size}px
                            </small>
                          )}
                        </div>

                        {scenes.length > 1 && (
                          <select
                            value={selectedScene?.id ?? ""}
                            onChange={(event) => {
                              setSelectedSceneId(event.target.value);
                              void loadSceneTokens(event.target.value);
                            }}
                          >
                            {scenes.map((scene) => (
                              <option key={scene.id} value={scene.id}>
                                {scene.name}
                              </option>
                            ))}
                          </select>
                        )}
                      </div>

                      {selectedScene ? (
                        <div className="map-scroll">
                          <div
                            className={`map-board ${sceneBackgroundObjectUrl ? "with-background" : ""}`}
                            style={{
                              width: selectedScene.width,
                              height: selectedScene.height,
                              backgroundSize: `${selectedScene.grid_size}px ${selectedScene.grid_size}px`,
                            }}
                          >
                            {sceneBackgroundObjectUrl && (
                              <img
                                alt=""
                                aria-hidden="true"
                                className="map-background-image"
                                src={sceneBackgroundObjectUrl}
                              />
                            )}

                            {sceneTokens.map((token) => (
                              <button
                                className="map-token"
                                key={token.id}
                                style={{
                                  left: token.x,
                                  top: token.y,
                                  width: token.size * selectedScene.grid_size,
                                  height: token.size * selectedScene.grid_size,
                                  background: token.color,
                                }}
                                title={`${token.name} (${token.x}, ${token.y})`}
                                type="button"
                              >
                                {token.name.slice(0, 2).toUpperCase()}
                              </button>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="empty-state compact-empty">
                          <Castle aria-hidden="true" />
                          <p>Aucune scene. Cree la premiere carte de combat.</p>
                        </div>
                      )}
                    </section>

                    <section className="vtt-control-panel">
                      <form className="scene-form" onSubmit={handleCreateScene}>
                        <h4>Nouvelle scene</h4>

                        <label>
                          Nom
                          <input name="name" minLength={2} maxLength={120} placeholder="Salle du donjon" required />
                        </label>

                        <label>
                          Description
                          <textarea name="description" rows={2} maxLength={2000} />
                        </label>

                        <div className="mini-grid three">
                          <label>
                            Grille
                            <input name="grid_size" type="number" min={16} max={200} defaultValue={50} />
                          </label>

                          <label>
                            Largeur
                            <input name="width" type="number" min={200} max={10000} defaultValue={1200} />
                          </label>

                          <label>
                            Hauteur
                            <input name="height" type="number" min={200} max={10000} defaultValue={800} />
                          </label>
                        </div>

                        <button className="ghost-button" disabled={isBusy} type="submit">
                          Creer scene
                        </button>
                      </form>

                      <form className="asset-form" onSubmit={handleUploadAsset}>
                        <h4>Fond de carte</h4>

                        <label>
                          Uploader une image
                          <input accept="image/png,image/jpeg,image/webp,image/gif" name="file" type="file" />
                        </label>

                        <button className="ghost-button" disabled={isBusy} type="submit">
                          Uploader carte
                        </button>
                      </form>

                      <div className="asset-picker">
                        <h4>Assets de campagne</h4>

                        {assets.length === 0 ? (
                          <p className="muted">Aucune carte uploadee.</p>
                        ) : (
                          <>
                            <label>
                              Image
                              <select value={selectedAssetId} onChange={(event) => setSelectedAssetId(event.target.value)}>
                                {assets.map((asset) => (
                                  <option key={asset.id} value={asset.id}>
                                    {asset.name}
                                  </option>
                                ))}
                              </select>
                            </label>

                            <button className="ghost-button" disabled={isBusy || !selectedScene || !selectedAssetId} onClick={handleSetSceneBackground} type="button">
                              Utiliser comme fond
                            </button>
                          </>
                        )}
                      </div>

                      <form className="token-form" onSubmit={handleCreateToken}>
                        <h4>Nouveau token</h4>

                        <label>
                          Personnage
                          <select name="character_id" defaultValue={selectedCharacter?.id ?? ""}>
                            <option value="">Token libre</option>
                            {characters.map((character) => (
                              <option key={character.id} value={character.id}>
                                {character.name}
                              </option>
                            ))}
                          </select>
                        </label>

                        <label>
                          Nom du token
                          <input name="name" maxLength={120} placeholder={selectedCharacter?.name ?? "Gobelin"} />
                        </label>

                        <div className="mini-grid three">
                          <label>
                            X
                            <input name="x" type="number" min={0} defaultValue={100} />
                          </label>

                          <label>
                            Y
                            <input name="y" type="number" min={0} defaultValue={100} />
                          </label>

                          <label>
                            Taille
                            <input name="size" type="number" min={1} max={8} defaultValue={1} />
                          </label>
                        </div>

                        <label>
                          Couleur
                          <input name="color" defaultValue="#7c3aed" />
                        </label>

                        <button className="primary-button" disabled={isBusy || !selectedScene} type="submit">
                          Ajouter token
                        </button>
                      </form>

                      <div className="token-list">
                        <h4>Tokens</h4>

                        {sceneTokens.length === 0 ? (
                          <p className="muted">Aucun token sur cette scene.</p>
                        ) : (
                          sceneTokens.map((token) => {
                            const step = selectedScene?.grid_size ?? 50;

                            return (
                              <article className="token-row" key={token.id}>
                                <span>
                                  <strong>{token.name}</strong>
                                  <small>
                                    x {token.x} - y {token.y}
                                  </small>
                                </span>

                                <div className="token-move-grid" aria-label={`Deplacer ${token.name}`}>
                                  <button type="button" onClick={() => void handleMoveToken(token, 0, -step)}>
                                    ↑
                                  </button>
                                  <button type="button" onClick={() => void handleMoveToken(token, -step, 0)}>
                                    ←
                                  </button>
                                  <button type="button" onClick={() => void handleMoveToken(token, step, 0)}>
                                    →
                                  </button>
                                  <button type="button" onClick={() => void handleMoveToken(token, 0, step)}>
                                    ↓
                                  </button>
                                </div>
                              </article>
                            );
                          })
                        )}
                      </div>
                    </section>
                  </div>
                </div>

                <div className="combat-section">
                  <div className="section-heading">
                    <h3>Combat</h3>
                    <Shield aria-hidden="true" />
                  </div>

                  <div className="combat-layout">
                    <section className="combat-panel">
                      <div className="combat-toolbar">
                        <div>
                          <strong>{selectedEncounter?.name ?? "Aucun combat"}</strong>
                          {selectedEncounter && (
                            <small>
                              {selectedEncounter.status} - round {selectedEncounter.round_number}
                            </small>
                          )}
                        </div>

                        {encounters.length > 1 && (
                          <select
                            value={selectedEncounter?.id ?? ""}
                            onChange={(event) => {
                              setSelectedEncounterId(event.target.value);
                              void loadEncounterDetail(event.target.value);
                            }}
                          >
                            {encounters.map((encounter) => (
                              <option key={encounter.id} value={encounter.id}>
                                {encounter.name}
                              </option>
                            ))}
                          </select>
                        )}
                      </div>

                      <form className="encounter-form" onSubmit={handleCreateEncounter}>
                        <label>
                          Nouveau combat
                          <input name="name" minLength={2} maxLength={120} placeholder="Embuscade gobeline" required />
                        </label>

                        <button className="ghost-button" disabled={isBusy} type="submit">
                          Creer combat
                        </button>
                      </form>

                      <div className="combat-action-row">
                        <button className="primary-button" disabled={isBusy || !selectedEncounter} onClick={handleStartEncounter} type="button">
                          Demarrer
                        </button>

                        <button className="ghost-button" disabled={isBusy || !selectedEncounter} onClick={handleNextTurn} type="button">
                          Tour suivant
                        </button>

                        <button className="ghost-button" disabled={isBusy || !selectedEncounter} onClick={handleEndEncounter} type="button">
                          Terminer
                        </button>
                      </div>

                      <div className="initiative-list">
                        {combatants.length === 0 ? (
                          <p className="muted">Aucun combattant dans ce combat.</p>
                        ) : (
                          combatants.map((combatant) => (
                            <article
                              className={`combatant-row ${
                                selectedEncounter?.active_combatant_id === combatant.id ? "active" : ""
                              } ${combatant.is_defeated ? "defeated" : ""}`}
                              key={combatant.id}
                            >
                              <div className="initiative-score">{combatant.initiative}</div>

                              <div className="combatant-main">
                                <strong>{combatant.name}</strong>
                                <small>
                                  CA {combatant.armor_class ?? "-"} - PV {combatant.hp_current ?? "-"}/{combatant.hp_max ?? "-"}
                                </small>
                                {combatant.conditions.length > 0 && (
                                  <small>Conditions: {combatant.conditions.join(", ")}</small>
                                )}
                              </div>

                              <div className="combatant-actions">
                                <button type="button" onClick={() => void handleAdjustCombatantHp(combatant, -1)}>
                                  -1
                                </button>
                                <button type="button" onClick={() => void handleAdjustCombatantHp(combatant, 1)}>
                                  +1
                                </button>
                                <button type="button" onClick={() => void handleToggleDefeated(combatant)}>
                                  {combatant.is_defeated ? "Relever" : "KO"}
                                </button>
                              </div>
                            </article>
                          ))
                        )}
                      </div>
                    </section>

                    <section className="combat-panel">
                      <h4>Ajouter un combattant</h4>

                      <form className="combatant-form" onSubmit={handleAddCombatant}>
                        <label>
                          Personnage
                          <select name="character_id" defaultValue={selectedCharacter?.id ?? ""}>
                            <option value="">Aucun personnage</option>
                            {characters.map((character) => (
                              <option key={character.id} value={character.id}>
                                {character.name}
                              </option>
                            ))}
                          </select>
                        </label>

                        <label>
                          Token
                          <select name="token_id" defaultValue="">
                            <option value="">Aucun token</option>
                            {sceneTokens.map((token) => (
                              <option key={token.id} value={token.id}>
                                {token.name}
                              </option>
                            ))}
                          </select>
                        </label>

                        <label>
                          Nom
                          <input name="name" maxLength={120} placeholder={selectedCharacter?.name ?? "Gobelin"} />
                        </label>

                        <div className="mini-grid three">
                          <label>
                            Init
                            <input name="initiative" type="number" min={-20} max={60} defaultValue={10} />
                          </label>

                          <label>
                            CA
                            <input name="armor_class" type="number" min={1} max={40} defaultValue={selectedCharacter?.armor_class ?? 10} />
                          </label>

                          <label>
                            PV
                            <input name="hp_current" type="number" min={0} defaultValue={selectedCharacter?.hp_current ?? 8} />
                          </label>
                        </div>

                        <label>
                          PV max
                          <input name="hp_max" type="number" min={0} defaultValue={selectedCharacter?.hp_max ?? 8} />
                        </label>

                        <button className="primary-button" disabled={isBusy || !selectedEncounter} type="submit">
                          Ajouter au combat
                        </button>
                      </form>
                    </section>
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
        <MessageDock message={message} />
      </section>
    </main>
  );
}
