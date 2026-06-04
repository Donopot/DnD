import {
  DoorOpen,
  ExternalLink,
  Maximize2,
  Minimize2,
  PanelRightClose,
  PanelRightOpen,
  Swords,
  UserPlus,
} from "lucide-react";
import { type FormEvent, lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import "./styles/index.css";
import { AuthPage } from "./components/AuthPage";
import { CampaignMap } from "./components/CampaignMap";
import { type CampaignView, CampaignViewTabs } from "./components/CampaignViewTabs";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { GmLobby } from "./components/GmLobby";
import { InvitePage } from "./components/InvitePage";
import { PlayerLobby } from "./components/PlayerLobby";
import { PlayerView } from "./components/PlayerView";
import { GmFloatingPanels } from "./panels/GmFloatingPanels";
import { GmDockedPanels } from "./panels/GmDockedPanels";
import {
  SESSION_LIVE_MODES,
  SESSION_LIVE_PANEL_SETS,
  type SessionLiveMode,
} from "./config/sessionLiveModes";
import { useFloatingPanels } from "./hooks/useFloatingPanels";
import { useSceneBackground } from "./hooks/useSceneBackground";
import { useTheme } from "./hooks/useTheme";
import { useToast } from "./hooks/useToast";
import { useGlobalKeyboard } from "./hooks/useGlobalKeyboard";
import { useAuthSession } from "./hooks/useAuthSession";
import { useCampaignData } from "./hooks/useCampaignData";
import { ensureStorageVersion } from "./utils/storageVersion";

// ── Lazy-loaded heavy components (only those used outside docked panels) ─
const GmCharacterInspector = lazy(() =>
  import("./components/GmCharacterInspector").then((m) => ({ default: m.GmCharacterInspector })),
);
const CharacterWizard = lazy(() =>
  import("./components/CharacterWizard").then((m) => ({ default: m.CharacterWizard })),
);

// Regular import (small component, used immediately)
import { KeyboardShortcuts } from "./components/KeyboardShortcuts";
import { PanelDock } from "./components/PanelDock";

const PanelFallback = () => (
  <div className="panel-loading">
    <div className="skeleton skeleton-title" />
    <div className="skeleton skeleton-text" />
    <div className="skeleton skeleton-text short" />
    <div className="skeleton skeleton-text" />
  </div>
);

import { apiRequest } from "./api/client";
import type {
  Asset,
  AuthResponse,
  Character,
  Combatant,
  Encounter,
  EncounterDetail,
  GameLogEntry,
  Handout,
  Roll,
  Scene,
  SceneToken,
} from "./api/types";

const MAP_PANEL_ID = "campaign-map";

export default function App() {
  // Ensure localStorage schema version — clear stale data on mismatch
  ensureStorageVersion();

  const auth = useAuthSession();
  const { token, user, login } = auth;
  const authLogout = auth.logout;

  const campaign = useCampaignData(token);
  const { campaigns, selectedCampaignId, selectedCampaign, members, latestInvite, activeInvites } = campaign;

  const [characters, setCharacters] = useState<Character[]>([]);
  const [selectedCharacterId, setSelectedCharacterId] = useState<string>("");
  const [selectedTokenId, setSelectedTokenId] = useState<string>("");
  const [inspectedCharacterId, setInspectedCharacterId] = useState<string>("");
  const [showCharacterWizard, setShowCharacterWizard] = useState(false);
  const [rolls, setRolls] = useState<Roll[]>([]);
  const [logEntries, setLogEntries] = useState<GameLogEntry[]>([]);
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [selectedSceneId, setSelectedSceneId] = useState<string>("");
  const [sceneTokens, setSceneTokens] = useState<SceneToken[]>([]);
  const [, setAssetList] = useState<Asset[]>([]);
  const [, setSelectedAssetId] = useState<string>("");
  const [encounters, setEncounters] = useState<Encounter[]>([]);
  const [selectedEncounterId, setSelectedEncounterId] = useState<string>("");
  const [, setCombatants] = useState<Combatant[]>([]);
  const [handouts, setHandouts] = useState<Handout[]>([]);
  const [presenceCount, setPresenceCount] = useState(0);
  const [realtimeStatus, setRealtimeStatus] = useState<"offline" | "connecting" | "online">(
    "offline",
  );
  const [message, setMessage] = useState("");
  const [inviteToken, setInviteToken] = useState<string | null>(() => {
    const match = window.location.pathname.match(/^\/invite\/([\w-]+)/);
    return match ? match[1] : null;
  });
  const [activeSessionLiveMode, setActiveSessionLiveMode] =
    useState<SessionLiveMode>("exploration");
  const [isBusy, setIsBusy] = useState(false);
  const [isFocusMap, setIsFocusMap] = useState(false);
  const [isPanelsHidden, setIsPanelsHidden] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [gmView, setGmView] = useState<CampaignView>("live");
  const fp = useFloatingPanels();
  const { theme, toggle: toggleTheme } = useTheme();
  const { toasts, show: showToast, dismiss: dismissToast } = useToast();
  const wsRef = useRef<WebSocket | null>(null);
  const fogRevealAbortRef = useRef<AbortController | null>(null);

  const selectedCharacter = useMemo(
    () => characters.find((character) => character.id === selectedCharacterId) ?? characters[0],
    [characters, selectedCharacterId],
  );

  const selectedScene = useMemo(
    () => scenes.find((scene) => scene.id === selectedSceneId) ?? scenes[0],
    [scenes, selectedSceneId],
  );

  const sceneBackgroundObjectUrl = useSceneBackground(selectedScene, token);

  const isMapFloating = useMemo(
    () => fp.panels.some((p) => p.id === MAP_PANEL_ID),
    [fp.panels],
  );

  const campaignMapProps = useMemo(() => {
    const playerIds = new Set(
      sceneTokens
        .filter((t) =>
          t.character_id &&
          characters.some(
            (c) =>
              c.id === t.character_id &&
              c.owner_user_id &&
              c.owner_user_id !== user?.id,
          ),
        )
        .map((t) => t.id),
    );
    return {
      isGM: true as const,
      wsRef,
      permissions: {
        canSelectToken: () => true,
        canMoveToken: () => true,
        canEditFog: true,
        canMultiSelect: true,
      } as const,
      playerTokenIds: playerIds,
      campaignId: selectedCampaign?.id ?? "",
      token,
      scenes,
      selectedScene,
      selectedSceneId,
      sceneTokens,
      sceneBackgroundObjectUrl,
      onSelectScene: setSelectedSceneId,
      selectedTokenId,
      onSelectToken: setSelectedTokenId,
      onLoadSceneTokens: (id: string) => void loadSceneTokens(id),
      onMoveToken: (t: SceneToken, dx: number, dy: number) => void handleMoveToken(t, dx, dy),
      onTokenAction: (action: string, t: SceneToken, v?: number) =>
        void handleTokenAction(action, t, v),
      onTokenBatchAction: (action: string, ts: SceneToken[], v?: number) =>
        void handleTokenBatchAction(action, ts, v),
    };
  }, [
    wsRef,
    sceneTokens,
    characters,
    user?.id,
    selectedCampaign?.id,
    token,
    scenes,
    selectedScene,
    selectedSceneId,
    sceneBackgroundObjectUrl,
    selectedTokenId,
  ]);

  // Auto-convert message state to toast notifications only after authentication.
  // On auth screens, keep message visible inside AuthPage.
  useEffect(() => {
    if (!message || !user) {
      return;
    }

    showToast(message, message.includes("Erreur") || message.includes("error") ? "error" : "info");
    setMessage("");
  }, [message, showToast, user]);

  // Listen for keyboard shortcut to toggle focus map (from CampaignMap)
  useEffect(() => {
    function onToggleFocus() {
      setIsFocusMap((prev) => !prev);
    }
    window.addEventListener("toggle-focus-map", onToggleFocus);
    return () => window.removeEventListener("toggle-focus-map", onToggleFocus);
  }, []);

  // Listen for "?" to show keyboard shortcuts
  useGlobalKeyboard(
    useCallback((e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (e.key === "?" && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        setShowShortcuts((prev) => !prev);
      }
    }, []),
    [],
  );

  /** Ensemble des IDs de panneaux visibles dans le mode de session actif. */
  const liveModePanelIds = useMemo(
    () => new Set(SESSION_LIVE_PANEL_SETS[activeSessionLiveMode] ?? []),
    [activeSessionLiveMode],
  );

  useEffect(() => {
    if (!token) {
      return;
    }
    void bootstrap(token);
  }, [token]);

  useEffect(() => {
    if (!token || !selectedCampaign) {
      campaign.clearMembers();
      setCharacters([]);
      setRolls([]);
      setLogEntries([]);
      setPresenceCount(0);
      return;
    }
    campaign.selectCampaign(selectedCampaign.id);
    void campaign.loadMembers(selectedCampaign.id);
    void loadCharacters(selectedCampaign.id);
    void loadSessionLog(selectedCampaign.id);
    void loadVttState(selectedCampaign.id);
    void loadAssets(selectedCampaign.id);
    void loadCombatState(selectedCampaign.id);
    void loadHandouts(selectedCampaign.id);
  }, [token, selectedCampaign?.id]);

  // ── Escape → close modals ──
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setShowCharacterWizard(false);
        setInspectedCharacterId("");
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const MAX_RECONNECT = 3;
  const reconnectAttempts = useRef(0);
  const reconnectTimer = useRef<number | undefined>(undefined);

  function connect() {
    wsRef.current?.close();
    if (reconnectTimer.current) {
      window.clearTimeout(reconnectTimer.current);
      reconnectTimer.current = undefined;
    }

    if (!token || !selectedCampaign?.id) {
      setRealtimeStatus("offline");
      return;
    }

    const protocol = window.location.protocol === "https:" ? "wss" : "ws";
    const socket = new WebSocket(
      `${protocol}://${window.location.host}/ws/campaigns/${selectedCampaign.id}`,
    );
    wsRef.current = socket;
    setRealtimeStatus("connecting");

    socket.onopen = () => {
      reconnectAttempts.current = 0;
      const activeToken = auth.token || "";
      socket.send(JSON.stringify({ type: "auth", token: activeToken }));
      setRealtimeStatus("online");
    };

    socket.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);

        if (payload.type === "error" && payload.detail) {
          setMessage(`WebSocket: ${payload.detail}`);
          return;
        }

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

        if (payload.type === "token_moved" && payload.scene_id === selectedScene?.id) {
          setSceneTokens((current) =>
            current.map((sceneToken) =>
              sceneToken.id === payload.token_id
                ? { ...sceneToken, x: Number(payload.x), y: Number(payload.y) }
                : sceneToken,
            ),
          );
        }
      } catch {
        /* ignore malformed messages */
      }
    };

    socket.onclose = (event) => {
      if (wsRef.current !== socket) return;
      setRealtimeStatus("offline");

      // Don't reconnect on auth failure (code 1008 = policy violation)
      if (event.code === 1008) {
        setMessage("WebSocket authentication failed — re-login required");
        return;
      }

      // Exponential backoff: 1s, 2s, 4s, max 3 attempts
      if (reconnectAttempts.current < MAX_RECONNECT) {
        reconnectAttempts.current += 1;
        const delay = Math.pow(2, reconnectAttempts.current - 1) * 1000;
        setMessage(`WebSocket disconnected — retrying in ${delay / 1000}s…`);
        reconnectTimer.current = window.setTimeout(() => {
          connect();
        }, delay);
      } else {
        setMessage("WebSocket disconnected — max retries reached");
      }
    };

    socket.onerror = () => {
      // onclose will fire after onerror — reconnect handled there
      setRealtimeStatus("offline");
    };
  }

  useEffect(() => {
    setPresenceCount(0);
    connect();

    return () => {
      wsRef.current?.close();
      if (reconnectTimer.current) {
        window.clearTimeout(reconnectTimer.current);
        reconnectTimer.current = undefined;
      }
    };
  }, [token, selectedCampaign?.id, selectedScene?.id]);

  async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
    return apiRequest<T>(path, auth.token, options);
  }

  async function bootstrap(activeToken: string) {
    try {
      await campaign.loadCampaigns(activeToken);
    } catch (error) {
      campaign.clearCampaigns();
      setMessage(error instanceof Error ? error.message : "Unable to load campaigns");
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
      const updated = await request<SceneToken>(`/api/tokens/${tokenToMove.id}/move`, {
        method: "PATCH",
        body: JSON.stringify({
          x: Math.max(0, tokenToMove.x + dx),
          y: Math.max(0, tokenToMove.y + dy),
        }),
      });

      setSceneTokens((current) => current.map((item) => (item.id === updated.id ? updated : item)));

      // ── Auto fog reveal ──────────────────────────────────────
      // If this token has character linkage and a vision radius, auto-reveal fog
      const visionRadius = tokenToMove.vision_radius ?? 0;
      if (tokenToMove.character_id && visionRadius > 0 && selectedScene) {
        // Abort any previous pending fog reveal
        fogRevealAbortRef.current?.abort();
        const controller = new AbortController();
        fogRevealAbortRef.current = controller;

        const gridSize = selectedScene.grid_size ?? 50;
        const centerX = updated.x + (updated.size * gridSize) / 2;
        const centerY = updated.y + (updated.size * gridSize) / 2;
        fetch(`/api/tokens/${tokenToMove.id}/reveal`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            center_x: centerX,
            center_y: centerY,
            radius_ft: visionRadius,
          }),
          signal: controller.signal,
        }).catch((err) => {
          if (err?.name === "AbortError") return; // cancelled by newer move
        });
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to move token");
    } finally {
      setIsBusy(false);
    }
  }

  // Per-token action without setIsBusy/setMessage (used by batch handler)
  async function performTokenAction(
    action: string,
    tokenToAct: SceneToken,
    value?: number,
  ): Promise<SceneToken | void> {
    switch (action) {
      case "duplicate": {
        const dup = await request<SceneToken>(`/api/tokens/${tokenToAct.id}/duplicate`, {
          method: "POST",
        });
        setSceneTokens((current) => [...current, dup]);
        return dup;
      }
      case "delete": {
        await request(`/api/tokens/${tokenToAct.id}`, { method: "DELETE" });
        setSceneTokens((current) => current.filter((t) => t.id !== tokenToAct.id));
        break;
      }
      case "hide":
      case "reveal": {
        const updated = await request<SceneToken>(`/api/tokens/${tokenToAct.id}`, {
          method: "PATCH",
          body: JSON.stringify({ is_hidden: action === "hide" }),
        });
        setSceneTokens((current) => current.map((t) => (t.id === updated.id ? updated : t)));
        return updated;
      }
      case "add-combat": {
        setMessage("Ajout au combat : ouvre le Générateur de rencontres pour ajouter ce token.");
        break;
      }
      case "front": {
        const fwd = await request<SceneToken>(`/api/tokens/${tokenToAct.id}/bring-forward`, {
          method: "POST",
        });
        setSceneTokens((current) => current.map((t) => (t.id === fwd.id ? fwd : t)));
        return fwd;
      }
      case "back": {
        const bwd = await request<SceneToken>(`/api/tokens/${tokenToAct.id}/send-backward`, {
          method: "POST",
        });
        setSceneTokens((current) => current.map((t) => (t.id === bwd.id ? bwd : t)));
        return bwd;
      }
      case "damage":
      case "heal": {
        const amount = value ?? 0;
        const hpCurrent = (tokenToAct.metadata?.hp_current as number) ?? 0;
        const hpMax = (tokenToAct.metadata?.hp_max as number) ?? 0;
        const newHp =
          action === "damage"
            ? Math.max(0, hpCurrent - amount)
            : Math.min(hpMax, hpCurrent + amount);
        const updated = await request<SceneToken>(`/api/tokens/${tokenToAct.id}`, {
          method: "PATCH",
          body: JSON.stringify({
            metadata: { ...tokenToAct.metadata, hp_current: newHp },
          }),
        });
        setSceneTokens((current) => current.map((t) => (t.id === updated.id ? updated : t)));
        return updated;
      }
    }
  }

  async function handleTokenAction(action: string, tokenToAct: SceneToken, value?: number) {
    setIsBusy(true);
    setMessage("");
    try {
      await performTokenAction(action, tokenToAct, value);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : `Unable to ${action} token`);
    } finally {
      setIsBusy(false);
    }
  }

  // Sequential batch action handler for multi-select
  async function handleTokenBatchAction(action: string, tokens: SceneToken[], value?: number) {
    setIsBusy(true);
    setMessage("");
    try {
      for (const token of tokens) {
        await performTokenAction(action, token, value);
      }
      if (action === "delete") {
        setMessage(`${tokens.length} token(s) supprimé(s).`);
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : `Unable to ${action} tokens`);
    } finally {
      setIsBusy(false);
    }
  }

  async function handleToggleTokenHidden(tokenToToggle: SceneToken) {
    try {
      const updated = await request<SceneToken>(`/api/tokens/${tokenToToggle.id}`, {
        method: "PATCH",
        body: JSON.stringify({ is_hidden: !tokenToToggle.is_hidden }),
      });
      setSceneTokens((current) =>
        current.map((t) => (t.id === updated.id ? updated : t)),
      );
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Impossible de changer la visibilité",
      );
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

      const effectiveEncounter =
        data.find((encounter) => encounter.id === selectedEncounterId) ?? data[0];
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

      setHandouts((current) => current.map((item) => (item.id === updated.id ? updated : item)));
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
      setAssetList(data);
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
      await campaign.createCampaign(
        String(form.get("name")),
        String(form.get("description")),
      );
      campaign.clearLatestInvite();
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
      const character = await request<Character>(
        `/api/campaigns/${selectedCampaign.id}/characters`,
        {
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
        },
      );
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
    if (!selectedCampaign) return;
    setIsBusy(true);
    setMessage("");
    try {
      await campaign.createInvite();
      setMessage("Invitation creee.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to create invite");
    } finally {
      setIsBusy(false);
    }
  }

  async function handleRevokeInvite(token: string) {
    if (!selectedCampaign) return;
    setIsBusy(true);
    try {
      await campaign.revokeInvite(token);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to revoke invite");
    } finally {
      setIsBusy(false);
    }
  }

  async function handleRoll(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedCampaign) return;
    const form = new FormData(event.currentTarget);
    await doRoll(
      String(form.get("formula")),
      String(form.get("label")),
      String(form.get("mode")) as "normal" | "advantage" | "disadvantage",
      String(form.get("visibility")),
      String(form.get("character_id") || ""),
    );
  }

  async function handleQuickRoll(
    formula: string,
    label: string,
    mode: "normal" | "advantage" | "disadvantage",
  ) {
    if (!selectedCampaign) return;
    await doRoll(formula, label, mode, "public", selectedCharacter?.id ?? "");
  }

  async function doRoll(
    formula: string,
    label: string,
    mode: "normal" | "advantage" | "disadvantage",
    visibility: string,
    characterId: string,
  ) {
    setIsBusy(true);
    setMessage("");
    try {
      const roll = await request<Roll>(`/api/campaigns/${selectedCampaign?.id}/rolls`, {
        method: "POST",
        body: JSON.stringify({
          formula,
          label,
          mode,
          visibility,
          character_id: characterId || null,
        }),
      });
      setRolls((current) => [roll, ...current].slice(0, 100));
      if (selectedCampaign) await loadSessionLog(selectedCampaign.id);
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
    wsRef.current?.close();
    authLogout();
    campaign.clearCampaigns();
    campaign.clearMembers();
    setCharacters([]);
    setRolls([]);
    setLogEntries([]);
    setPresenceCount(0);
    setSelectedCharacterId("");
    campaign.clearInvites();
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
          login(newToken);
        }}
        onJoined={async () => {
          await campaign.loadCampaigns(token);
          setInviteToken(null);
          if (window.history.pushState) {
            window.history.pushState({}, "", "/");
          }
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
            login(auth.access_token, auth.user);
            await campaign.loadCampaigns(auth.access_token);
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
            login(auth.access_token, auth.user);
            await campaign.loadCampaigns(auth.access_token);
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
          void campaign.loadCampaigns(token);
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
    <ErrorBoundary>
      <main className={`gm-campaign-shell${isFocusMap ? " focus-map" : ""}`}>
      {/* ── Sidebar ─────────────────────────────────────────── */}
      <aside className="gm-sidebar">
        <div className="brand-mark compact">
          <Swords aria-hidden="true" />
          DnD
        </div>

        <nav className="gm-campaign-list" aria-label="Mes campagnes">
          <h4>Mes tables</h4>
          {campaigns.map((c) => (
            <button
              className={`gm-campaign-item ${selectedCampaign?.id === c.id ? "selected" : ""}`}
              key={c.id}
              onClick={() => {
                campaign.selectCampaign(c.id);
                campaign.clearLatestInvite();
                void campaign.loadInvites(c.id);
              }}
              type="button"
              aria-label={`${c.name} — ${c.member_count} membres`}
              aria-current={selectedCampaign?.id === c.id ? "true" : undefined}
            >
              <strong>{c.name}</strong>
              <small>{c.member_count} membres</small>
            </button>
          ))}
        </nav>

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
          <button
            className="primary-button compact"
            disabled={isBusy}
            onClick={handleCreateInvite}
            type="button"
          >
            <UserPlus aria-hidden="true" size={14} />
            Inviter
          </button>
          <button className="ghost-button compact" onClick={logout} type="button">
            <DoorOpen aria-hidden="true" size={14} />
            Sortir
          </button>
        </div>
        {latestInvite && (
          <div className="invite-link-box">
            <p className="invite-link-label">Lien d'invitation :</p>
            <div className="invite-link-row">
              <input
                className="invite-link-input"
                readOnly
                value={`${window.location.origin}/invite/${latestInvite.token}`}
                onClick={(e) => (e.target as HTMLInputElement).select()}
              />
              <button
                className="compact"
                onClick={() => {
                  void navigator.clipboard.writeText(
                    `${window.location.origin}/invite/${latestInvite.token}`,
                  );
                }}
                type="button"
              >
                📋
              </button>
            </div>
          </div>
        )}
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
          <button
            className="focus-map-btn"
            onClick={() => setIsFocusMap((prev) => !prev)}
            title={isFocusMap ? "Quitter plein écran" : "Carte plein écran"}
            type="button"
          >
            {isFocusMap ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>
          <button
            className={`gm-panels-toggle${isPanelsHidden ? " active" : ""}`}
            onClick={() => setIsPanelsHidden((prev) => !prev)}
            title={isPanelsHidden ? "Afficher les panneaux" : "Masquer les panneaux"}
            type="button"
          >
            {isPanelsHidden ? <PanelRightOpen size={16} /> : <PanelRightClose size={16} />}
          </button>
          <button
            className="focus-map-btn"
            onClick={toggleTheme}
            title={theme === "dark" ? "Mode clair" : "Mode sombre"}
            type="button"
          >
            {theme === "dark" ? "☀️" : "🌙"}
          </button>
          {!isMapFloating && (
            <button
              className="focus-map-btn"
              onClick={() => fp.open(MAP_PANEL_ID, "🗺️ Carte", 80, 80, 1100, 720)}
              title="Détacher la carte en panneau flottant"
              type="button"
            >
              🗺️
            </button>
          )}
        </div>

        <CampaignViewTabs activeView={gmView} onChange={setGmView} />

        {!isMapFloating && (
          <CampaignMap {...campaignMapProps} />
        )}
      </section>

      {/* ── Droite — Panneaux dockés ─────────────────────────── */}
      <Suspense fallback={<PanelFallback />}>
        <aside className="gm-panels" style={{ display: isPanelsHidden ? "none" : "" }}>
          <GmDockedPanels
            gmView={gmView}
            liveModePanelIds={liveModePanelIds}
            fpOpen={(id, title) => fp.open(id, title)}
            selectedCampaign={selectedCampaign}
            token={token}
            scenes={scenes}
            sceneTokens={sceneTokens}
            selectedScene={selectedScene}
            selectedTokenId={selectedTokenId}
            characters={characters}
            selectedCharacter={selectedCharacter}
            handouts={handouts}
            rolls={rolls}
            logEntries={logEntries}
            members={members}
            encounters={encounters}
            wsRef={wsRef}
            user={user}
            isBusy={isBusy}
            latestInvite={latestInvite}
            activeInvites={activeInvites}
            handleQuickRoll={handleQuickRoll}
            handleRoll={handleRoll}
            handleLogNote={handleLogNote}
            handleCreateHandout={handleCreateHandout}
            handleRevealHandout={handleRevealHandout}
            handleDeleteHandout={handleDeleteHandout}
            handleToggleTokenHidden={handleToggleTokenHidden}
            handleMoveToken={handleMoveToken}
            handleCreateCharacter={handleCreateCharacter}
            handleCreateInvite={handleCreateInvite}
            handleRevokeInvite={handleRevokeInvite}
            setSelectedTokenId={setSelectedTokenId}
            setSceneTokens={setSceneTokens}
            setSelectedSceneId={setSelectedSceneId}
            setSelectedCharacterId={setSelectedCharacterId}
            setInspectedCharacterId={setInspectedCharacterId}
            setShowCharacterWizard={setShowCharacterWizard}
            setCharacters={setCharacters}
            setLogEntries={setLogEntries}
            loadCombatState={loadCombatState}
            loadSceneTokens={loadSceneTokens}
            loadVttState={loadVttState}
          />
        </aside>
      </Suspense>

      {/* ── Floating Panels ──────────────────────────────────── */}
      <GmFloatingPanels
        fp={fp}
        selectedCampaign={selectedCampaign}
        token={token}
        scenes={scenes}
        encounters={encounters}
        characters={characters}
        selectedCharacter={selectedCharacter}
        handouts={handouts}
        rolls={rolls}
        logEntries={logEntries}
        members={members}
        wsRef={wsRef}
        user={user}
        isBusy={isBusy}
        selectedSceneId={selectedSceneId}
        selectedTokenId={selectedTokenId}
        selectedScene={selectedScene}
        sceneTokens={sceneTokens}
        campaignMapProps={campaignMapProps}
        handleQuickRoll={handleQuickRoll}
        handleRoll={handleRoll}
        handleLogNote={handleLogNote}
        handleCreateHandout={handleCreateHandout}
        handleRevealHandout={handleRevealHandout}
        handleDeleteHandout={handleDeleteHandout}
        handleToggleTokenHidden={handleToggleTokenHidden}
        handleMoveToken={handleMoveToken}
        loadCombatState={loadCombatState}
        loadSceneTokens={loadSceneTokens}
        loadVttState={loadVttState}
        setSelectedTokenId={setSelectedTokenId}
        setSceneTokens={setSceneTokens}
        setSelectedSceneId={setSelectedSceneId}
      />

      {/* ── Panel Dock (minimized panels) ──────────────────────── */}
      <PanelDock panels={fp.panels} onRestore={(id) => fp.minimize(id)} />

      {/* ── Toast notifications ──────────────────────────────── */}
      <div className="toast-container">
        {toasts.map((t) => (
          <div key={t.id} className={`toast-item${t.type === "error" ? " error" : ""}`}>
            <span>{t.message}</span>
            <button onClick={() => dismissToast(t.id)} type="button">
              ✕
            </button>
          </div>
        ))}
      </div>

      {/* ── Character Wizard Modal ───────────────────────────── */}
      {showCharacterWizard && (
        <div className="modal-overlay" onClick={() => setShowCharacterWizard(false)}>
          <div
            className="modal-content"
            role="dialog"
            aria-modal="true"
            aria-label="Création de personnage"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: "500px" }}
          >
            <CharacterWizard
              token={token}
              campaignId={selectedCampaign?.id ?? ""}
              onCreated={() => {
                setShowCharacterWizard(false);
                if (selectedCampaign) {
                  void loadCharacters(selectedCampaign.id);
                }
              }}
            />
          </div>
        </div>
      )}

      {/* ── Keyboard Shortcuts Overlay ─────────────────────────── */}
      {showShortcuts && <KeyboardShortcuts onClose={() => setShowShortcuts(false)} />}

      {/* ── Character Inspector Modal ─────────────────────────── */}
      {inspectedCharacterId &&
        (() => {
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
    </ErrorBoundary>
  );
}
