import {
  DoorOpen,
  ExternalLink,
  Maximize2,
  Minimize2,
  PanelRightClose,
  PanelRightOpen,
  Plus,
  Swords,
  UserPlus,
} from "lucide-react";
import { type FormEvent, lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import "./styles/index.css";
import { AuthPage } from "./components/AuthPage";
import { CampaignMap } from "./components/CampaignMap";
import { type CampaignView, CampaignViewTabs } from "./components/CampaignViewTabs";
import { EditCharacterSheet } from "./components/EditCharacterSheet";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { FloatingPanel } from "./components/FloatingPanel";
import { GmLobby } from "./components/GmLobby";
import { GmNotesPanel } from "./components/GmNotesPanel";
import { HandoutPanel } from "./components/HandoutPanel";
import { InitiativePanel } from "./components/InitiativePanel";
import { InvitePage } from "./components/InvitePage";
import { PartySummaryPanel } from "./components/PartySummaryPanel";
import { PlayerLobby } from "./components/PlayerLobby";
import { PlayerView } from "./components/PlayerView";
import { QuickActions } from "./components/QuickActions";
import { SessionLogPanel } from "./components/SessionLogPanel";
import { TokenDetailPanel } from "./components/TokenDetailPanel";
import { VisibilityInspectorPanel } from "./components/VisibilityInspectorPanel";
import {
  SESSION_LIVE_MODES,
  SESSION_LIVE_PANEL_SETS,
  type SessionLiveMode,
} from "./config/sessionLiveModes";
import { useFloatingPanels } from "./hooks/useFloatingPanels";
import { useSceneBackground } from "./hooks/useSceneBackground";
import { useTheme } from "./hooks/useTheme";
import { useToast } from "./hooks/useToast";

// ── Lazy-loaded heavy components (code-split for faster initial load) ────
const CombatTracker = lazy(() =>
  import("./components/CombatTracker").then((m) => ({ default: m.CombatTracker })),
);
const DiceRoller = lazy(() =>
  import("./components/DiceRoller").then((m) => ({ default: m.DiceRoller })),
);
const EncounterBuilder = lazy(() =>
  import("./components/EncounterBuilder").then((m) => ({ default: m.EncounterBuilder })),
);
const SessionStats = lazy(() =>
  import("./components/SessionStats").then((m) => ({ default: m.SessionStats })),
);
const HomebrewPanel = lazy(() =>
  import("./components/HomebrewPanel").then((m) => ({ default: m.HomebrewPanel })),
);
const RulesReference = lazy(() =>
  import("./components/RulesReference").then((m) => ({ default: m.RulesReference })),
);
const GmCharacterInspector = lazy(() =>
  import("./components/GmCharacterInspector").then((m) => ({ default: m.GmCharacterInspector })),
);
const GmMessagePanel = lazy(() =>
  import("./components/GmMessagePanel").then((m) => ({ default: m.GmMessagePanel })),
);
const BestiaryPanel = lazy(() =>
  import("./components/BestiaryPanel").then((m) => ({ default: m.BestiaryPanel })),
);
const SpellbookPanel = lazy(() =>
  import("./components/SpellbookPanel").then((m) => ({ default: m.SpellbookPanel })),
);
const DungeonGenerator = lazy(() =>
  import("./components/DungeonGenerator").then((m) => ({ default: m.DungeonGenerator })),
);
const ItemCompendium = lazy(() =>
  import("./components/ItemCompendium").then((m) => ({ default: m.ItemCompendium })),
);
const CharacterWizard = lazy(() =>
  import("./components/CharacterWizard").then((m) => ({ default: m.CharacterWizard })),
);
const NpcGenerator = lazy(() =>
  import("./components/NpcGenerator").then((m) => ({ default: m.default })),
);
const ChatPanel = lazy(() =>
  import("./components/ChatPanel").then((m) => ({ default: m.default })),
);
const AmbiancePanel = lazy(() =>
  import("./components/AmbiancePanel").then((m) => ({ default: m.AmbiancePanel })),
);
const ScenePanel = lazy(() =>
  import("./components/ScenePanel").then((m) => ({ default: m.ScenePanel })),
);
const TokenPanel = lazy(() =>
  import("./components/TokenPanel").then((m) => ({ default: m.TokenPanel })),
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

const MAP_PANEL_ID = "campaign-map";

const TOKEN_STORAGE_KEY = "dnd_access_token";

export default function App() {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_STORAGE_KEY) ?? "");
  const [user, setUser] = useState<User | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>("");
  const [members, setMembers] = useState<Member[]>([]);
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
  const [latestInvite, setLatestInvite] = useState<Invite | null>(null);
  const [activeInvites, setActiveInvites] = useState<Invite[]>([]);
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
  useEffect(() => {
    function handleGlobalKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (e.key === "?" && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        setShowShortcuts((prev) => !prev);
      }
    }
    window.addEventListener("keydown", handleGlobalKey);
    return () => window.removeEventListener("keydown", handleGlobalKey);
  }, []);

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
      const activeToken = token || localStorage.getItem(TOKEN_STORAGE_KEY) || "";
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
    const activeToken = token || localStorage.getItem(TOKEN_STORAGE_KEY) || "";
    return apiRequest<T>(path, activeToken, options);
  }

  async function bootstrap(activeToken: string) {
    try {
      setUser(await request<User>("/api/auth/me"));
    } catch {
      logout();
      return;
    }

    try {
      await loadCampaigns(activeToken);
    } catch (error) {
      setCampaigns([]);
      setMessage(error instanceof Error ? error.message : "Unable to load campaigns");
    }
  }

  async function loadCampaigns(activeToken = token) {
    const data = await request<Campaign[]>("/api/campaigns");
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
        }).catch(() => {});
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to move token");
    } finally {
      setIsBusy(false);
    }
  }

  async function handleTokenAction(action: string, tokenToAct: SceneToken, value?: number) {
    setIsBusy(true);
    setMessage("");

    try {
      switch (action) {
        case "duplicate": {
          // Create a new token with same properties
          if (!selectedScene) break;
          const dup = await request<SceneToken>(`/api/scenes/${selectedScene.id}/tokens`, {
            method: "POST",
            body: JSON.stringify({
              name: `${tokenToAct.name} (copie)`,
              x: tokenToAct.x + 50,
              y: tokenToAct.y + 50,
              color: tokenToAct.color,
              size: tokenToAct.size,
              character_id: tokenToAct.character_id,
            }),
          });
          setSceneTokens((current) => [...current, dup]);
          break;
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
          break;
        }
        case "add-combat": {
          setMessage("Ajout au combat : ouvre le Générateur de rencontres pour ajouter ce token.");
          break;
        }
        case "front":
        case "back": {
          setMessage("Z-index : fonctionnalité à venir.");
          break;
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
          break;
        }
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : `Unable to ${action} token`);
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
      void loadInvites();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to create invite");
    } finally {
      setIsBusy(false);
    }
  }

  async function loadInvites(campaignId?: string) {
    const cid = campaignId ?? selectedCampaign?.id;
    if (!cid) return;
    try {
      const invites = await request<Invite[]>(`/api/campaigns/${cid}/invites`);
      setActiveInvites(invites);
    } catch {
      // Silently ignore — user may not be GM
    }
  }

  async function handleRevokeInvite(token: string) {
    if (!selectedCampaign) return;
    setIsBusy(true);
    try {
      await request(`/api/invites/${token}/revoke`, { method: "POST" });
      setActiveInvites((prev) => prev.filter((inv) => inv.token !== token));
      if (latestInvite?.token === token) setLatestInvite(null);
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
      await loadSessionLog(selectedCampaign?.id);
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
    setActiveInvites([]);
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
        onJoined={async () => {
          const activeToken = localStorage.getItem(TOKEN_STORAGE_KEY) || token;
          await loadCampaigns(activeToken);
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
                setSelectedCampaignId(c.id);
                setLatestInvite(null);
                void loadInvites(c.id);
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

      {/* ── Droite — Panneaux ───────────────────────────────── */}
      <Suspense fallback={<PanelFallback />}>
        <ErrorBoundary>
          <aside className="gm-panels" style={{ display: isPanelsHidden ? "none" : "" }}>
            {/* ── LIVE — Combat, Dés, Actions ────────────────────── */}
            {gmView === "live" && (
              <>
                {/* Combat Tracker */}
                {liveModePanelIds.has("combat") && (
                  <details className="gm-panel-section" open>
                    <summary>
                      ⚔️ Combat
                      <button
                        className="panel-detach-btn"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          fp.open("combat", "⚔️ Combat");
                        }}
                        title="Détacher en panneau flottant"
                        type="button"
                      >
                        <ExternalLink size={12} />
                      </button>
                    </summary>
                    <CombatTracker
                      campaignId={selectedCampaign?.id ?? ""}
                      token={token}
                      onEncounterChange={() => void loadCombatState(selectedCampaign?.id ?? "")}
                    />
                  </details>
                )}

                {/* Encounter Builder */}
                {liveModePanelIds.has("encounter-builder") && (
                  <details className="gm-panel-section">
                    <summary>
                      🧩 Générateur de rencontres
                      <button
                        className="panel-detach-btn"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          fp.open("encounter-builder", "🧩 Rencontres");
                        }}
                        title="Détacher en panneau flottant"
                        type="button"
                      >
                        <ExternalLink size={12} />
                      </button>
                    </summary>
                    <EncounterBuilder campaignId={selectedCampaign?.id ?? ""} token={token} />
                  </details>
                )}

                {/* Dice Roller */}
                {liveModePanelIds.has("dice-roller") && (
                  <details className="gm-panel-section">
                    <summary>
                      🎲 Lancer de dés
                      <button
                        className="panel-detach-btn"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          fp.open("dice-roller", "🎲 Lancer de dés");
                        }}
                        title="Détacher en panneau flottant"
                        type="button"
                      >
                        <ExternalLink size={12} />
                      </button>
                    </summary>
                    <DiceRoller
                      onRoll={(formula, lbl, m) => void handleQuickRoll(formula, lbl, m)}
                    />
                  </details>
                )}

                {/* Quick Actions / Macros */}
                {liveModePanelIds.has("quick-actions") && (
                  <details className="gm-panel-section">
                    <summary>
                      ⚡ Actions rapides
                      <button
                        className="panel-detach-btn"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          fp.open("quick-actions", "⚡ Actions rapides");
                        }}
                        title="Détacher"
                        type="button"
                      >
                        <ExternalLink size={12} />
                      </button>
                    </summary>
                    <QuickActions
                      onRoll={(formula, lbl, m) => void handleQuickRoll(formula, lbl, m)}
                    />
                  </details>
                )}

                {/* Messages MJ → Joueurs */}
                {liveModePanelIds.has("gm-messages") && (
                  <details className="gm-panel-section">
                    <summary>
                      💬 Communication
                      <button
                        className="panel-detach-btn"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          fp.open("gm-messages", "💬 Communication");
                        }}
                        title="Détacher"
                        type="button"
                      >
                        <ExternalLink size={12} />
                      </button>
                    </summary>
                    <GmMessagePanel
                      campaignId={selectedCampaign?.id ?? ""}
                      token={token}
                      members={members}
                    />
                  </details>
                )}

                {/* ChatPanel */}
                {liveModePanelIds.has("chat") && (
                  <details className="gm-panel-section">
                    <summary>
                      💭 Chat en direct
                      <button
                        className="panel-detach-btn"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          fp.open("chat", "💭 Chat");
                        }}
                        title="Détacher"
                        type="button"
                      >
                        <ExternalLink size={12} />
                      </button>
                    </summary>
                    <ChatPanel
                      campaignId={selectedCampaign?.id ?? ""}
                      wsRef={wsRef}
                      userId={user?.id}
                      displayName={user?.display_name}
                    />
                  </details>
                )}

                {/* AmbiancePanel */}
                {liveModePanelIds.has("ambiance") && (
                  <details className="gm-panel-section">
                    <summary>
                      🎵 Ambiance
                      <button
                        className="panel-detach-btn"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          fp.open("ambiance", "🎵 Ambiance");
                        }}
                        title="Détacher"
                        type="button"
                      >
                        <ExternalLink size={12} />
                      </button>
                    </summary>
                    <AmbiancePanel isGM={true} />
                  </details>
                )}

                {/* GmNotesPanel */}
                {liveModePanelIds.has("gm-notes") && (
                  <details className="gm-panel-section">
                    <summary>
                      📝 Notes MJ
                      <button
                        className="panel-detach-btn"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          fp.open("gm-notes", "📝 Notes MJ");
                        }}
                        title="Détacher"
                        type="button"
                      >
                        <ExternalLink size={12} />
                      </button>
                    </summary>
                    <GmNotesPanel
                      campaignId={selectedCampaign?.id ?? ""}
                      selectedScene={selectedScene}
                      selectedToken={sceneTokens.find((t) => t.id === selectedTokenId)}
                    />
                  </details>
                )}

                {/* InitiativePanel */}
                {liveModePanelIds.has("initiative") && (
                  <details className="gm-panel-section">
                    <summary>
                      ⏱️ Initiative
                      <button
                        className="panel-detach-btn"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          fp.open("initiative", "⏱️ Initiative");
                        }}
                        title="Détacher"
                        type="button"
                      >
                        <ExternalLink size={12} />
                      </button>
                    </summary>
                    <InitiativePanel sceneId={selectedSceneId} sceneTokens={sceneTokens} />
                  </details>
                )}

                {/* TokenDetailPanel */}
                {liveModePanelIds.has("token-detail") && (
                  <details className="gm-panel-section">
                    <summary>
                      🔍 Détail token
                      <button
                        className="panel-detach-btn"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          fp.open("token-detail", "🔍 Détail token");
                        }}
                        title="Détacher en panneau flottant"
                        type="button"
                      >
                        <ExternalLink size={12} />
                      </button>
                    </summary>
                    <TokenDetailPanel
                      selectedScene={selectedScene}
                      selectedToken={sceneTokens.find((t) => t.id === selectedTokenId)}
                      selectedTokenCharacter={characters.find(
                        (c) =>
                          c.id === sceneTokens.find((t) => t.id === selectedTokenId)?.character_id,
                      )}
                      selectedTokenPosition={(() => {
                        const t = sceneTokens.find((t) => t.id === selectedTokenId);
                        return t ? { x: t.x, y: t.y } : undefined;
                      })()}
                      onDeselectToken={() => setSelectedTokenId("")}
                      onNudgeSelectedToken={(dx, dy) => {
                        const t = sceneTokens.find((t) => t.id === selectedTokenId);
                        if (t) void handleMoveToken(t, dx, dy);
                      }}
                    />
                  </details>
                )}

                {/* VisibilityInspectorPanel */}
                {liveModePanelIds.has("visibility-inspector") && (
                  <details className="gm-panel-section">
                    <summary>
                      👁️ Visibilité
                      <button
                        className="panel-detach-btn"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          fp.open("visibility-inspector", "👁️ Visibilité");
                        }}
                        title="Détacher"
                        type="button"
                      >
                        <ExternalLink size={12} />
                      </button>
                    </summary>
                    <VisibilityInspectorPanel
                      selectedScene={selectedScene}
                      selectedToken={sceneTokens.find((t) => t.id === selectedTokenId)}
                      sceneTokens={sceneTokens}
                      isGM={true}
                      onToggleTokenHidden={handleToggleTokenHidden}
                      onOpenPanel={(panelId) => fp.open(panelId, "")}
                    />
                  </details>
                )}
              </>
            )}

            {/* ── JOURNAL — Logs, Stats ──────────────────────────── */}
            {gmView === "journal" && (
              <>
                {/* Session Log */}
                {liveModePanelIds.has("session-log") && (
                  <details className="gm-panel-section">
                    <summary>
                      📋 Journal
                      <button
                        className="panel-detach-btn"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          fp.open("session-log", "📋 Journal");
                        }}
                        title="Détacher"
                        type="button"
                      >
                        <ExternalLink size={12} />
                      </button>
                    </summary>
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
                              const response = await fetch(url, {
                                headers: { Authorization: `Bearer ${token}` },
                              });
                              if (response.ok) setLogEntries(await response.json());
                            } catch {
                              /* ignore */
                            }
                          })();
                        }
                      }}
                    />
                  </details>
                )}

                {/* Session Stats */}
                {liveModePanelIds.has("session-stats") && (
                  <details className="gm-panel-section">
                    <summary>
                      📊 Statistiques
                      <button
                        className="panel-detach-btn"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          fp.open("session-stats", "📊 Statistiques");
                        }}
                        title="Détacher"
                        type="button"
                      >
                        <ExternalLink size={12} />
                      </button>
                    </summary>
                    <SessionStats campaignId={selectedCampaign?.id ?? ""} token={token} />
                  </details>
                )}
              </>
            )}

            {/* ── PREPARATION — Donjons, Documents ───────────────── */}
            {gmView === "preparation" && (
              <>
                {/* Scene Panel */}
                {liveModePanelIds.has("scene") && (
                  <details className="gm-panel-section">
                    <summary>
                      🎬 Scènes
                      <button
                        className="panel-detach-btn"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          fp.open("scene", "🎬 Scènes");
                        }}
                        title="Détacher"
                        type="button"
                      >
                        <ExternalLink size={12} />
                      </button>
                    </summary>
                    <ScenePanel
                      campaignId={selectedCampaign?.id ?? ""}
                      token={token}
                      scenes={scenes}
                      onSelectScene={(id) => setSelectedSceneId(id)}
                      onScenesChanged={() => {
                        if (selectedCampaign?.id) {
                          void loadVttState(selectedCampaign.id);
                        }
                      }}
                    />
                  </details>
                )}

                {/* Token Panel */}
                {liveModePanelIds.has("tokens") && (
                  <details className="gm-panel-section">
                    <summary>
                      🎭 Tokens
                      <button
                        className="panel-detach-btn"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          fp.open("tokens", "🎭 Tokens");
                        }}
                        title="Détacher"
                        type="button"
                      >
                        <ExternalLink size={12} />
                      </button>
                    </summary>
                    <TokenPanel
                      campaignId={selectedCampaign?.id ?? ""}
                      token={token}
                      sceneId={selectedScene?.id ?? ""}
                      tokens={sceneTokens}
                      onTokensChanged={() => {
                        if (selectedScene?.id) {
                          void loadSceneTokens(selectedScene.id);
                        }
                      }}
                    />
                  </details>
                )}

                {/* Dungeon Generator */}
                {liveModePanelIds.has("dungeon-generator") && (
                  <details className="gm-panel-section">
                    <summary>
                      🗺️ Générateur de donjons
                      <button
                        className="panel-detach-btn"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          fp.open("dungeon-generator", "🗺️ Donjons");
                        }}
                        title="Détacher"
                        type="button"
                      >
                        <ExternalLink size={12} />
                      </button>
                    </summary>
                    <DungeonGenerator token={token} />
                  </details>
                )}

                {/* Handouts */}
                {liveModePanelIds.has("handouts") && (
                  <details className="gm-panel-section">
                    <summary>
                      📄 Documents
                      <button
                        className="panel-detach-btn"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          fp.open("handouts", "📄 Documents");
                        }}
                        title="Détacher"
                        type="button"
                      >
                        <ExternalLink size={12} />
                      </button>
                    </summary>
                    <HandoutPanel
                      handouts={handouts}
                      scenes={scenes}
                      isBusy={isBusy}
                      campaignId={selectedCampaign?.id ?? ""}
                      onCreateHandout={handleCreateHandout}
                      onRevealHandout={(h) => void handleRevealHandout(h)}
                      onDeleteHandout={(h) => void handleDeleteHandout(h)}
                    />
                  </details>
                )}
              </>
            )}

            {/* ── LIBRARY — Bestiaire, Sorts, Équipement ──────────── */}
            {gmView === "library" && (
              <>
                {/* Bestiary */}
                {liveModePanelIds.has("bestiary") && (
                  <details className="gm-panel-section">
                    <summary>
                      💀 Bestiaire
                      <button
                        className="panel-detach-btn"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          fp.open("bestiary", "💀 Bestiaire");
                        }}
                        title="Détacher en panneau flottant"
                        type="button"
                      >
                        <ExternalLink size={12} />
                      </button>
                    </summary>
                    <BestiaryPanel token={token} />
                  </details>
                )}

                {/* Spellbook */}
                {liveModePanelIds.has("spellbook") && (
                  <details className="gm-panel-section">
                    <summary>
                      ✨ Grimoire
                      <button
                        className="panel-detach-btn"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          fp.open("spellbook", "✨ Grimoire");
                        }}
                        title="Détacher en panneau flottant"
                        type="button"
                      >
                        <ExternalLink size={12} />
                      </button>
                    </summary>
                    <SpellbookPanel token={token} />
                  </details>
                )}

                {/* Item Compendium */}
                {liveModePanelIds.has("items") && (
                  <details className="gm-panel-section">
                    <summary>
                      🎒 Équipement
                      <button
                        className="panel-detach-btn"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          fp.open("items", "🎒 Équipement");
                        }}
                        title="Détacher"
                        type="button"
                      >
                        <ExternalLink size={12} />
                      </button>
                    </summary>
                    <ItemCompendium token={token} />
                  </details>
                )}

                {/* Homebrew */}
                {liveModePanelIds.has("homebrew") && (
                  <details className="gm-panel-section">
                    <summary>
                      📚 Bibliothèque
                      <button
                        className="panel-detach-btn"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          fp.open("homebrew", "📚 Bibliothèque");
                        }}
                        title="Détacher"
                        type="button"
                      >
                        <ExternalLink size={12} />
                      </button>
                    </summary>
                    <HomebrewPanel
                      campaignId={selectedCampaign?.id ?? ""}
                      token={token}
                      scenes={scenes}
                      encounters={encounters}
                      isBusy={isBusy}
                    />
                  </details>
                )}

                {/* SRD Reference */}
                {liveModePanelIds.has("rules") && (
                  <details className="gm-panel-section">
                    <summary>
                      📖 Règles (SRD)
                      <button
                        className="panel-detach-btn"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          fp.open("rules", "📖 Règles SRD");
                        }}
                        title="Détacher"
                        type="button"
                      >
                        <ExternalLink size={12} />
                      </button>
                    </summary>
                    <RulesReference />
                  </details>
                )}

                {/* NpcGenerator */}
                {liveModePanelIds.has("npc-generator") && (
                  <details className="gm-panel-section">
                    <summary>
                      🧑 Générateur PNJ
                      <button
                        className="panel-detach-btn"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          fp.open("npc-generator", "🧑 Générateur PNJ");
                        }}
                        title="Détacher"
                        type="button"
                      >
                        <ExternalLink size={12} />
                      </button>
                    </summary>
                    <NpcGenerator />
                  </details>
                )}
              </>
            )}

            {/* ── CAMPAIGN — Infos, Membres ───────────────────────── */}
            {gmView === "campaign" && liveModePanelIds.has("campaign-info") && (
              <details className="gm-panel-section" open>
                <summary>📋 Infos campagne</summary>
                {selectedCampaign && (
                  <div className="campaign-overview">
                    <p className="muted">{selectedCampaign.description || "Aucune description."}</p>
                    <div className="action-row">
                      <button
                        className="primary-button compact"
                        disabled={isBusy}
                        onClick={handleCreateInvite}
                        type="button"
                      >
                        <UserPlus aria-hidden="true" size={14} /> Inviter un joueur
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
                    {activeInvites.length > 0 && (
                      <div className="active-invites-list">
                        <h4>Invitations actives ({activeInvites.length})</h4>
                        {activeInvites.map((inv) => (
                          <div className="active-invite-row" key={inv.token}>
                            <span className="invite-token-preview">
                              /invite/{inv.token.slice(0, 10)}…
                            </span>
                            <span className="invite-uses">
                              {inv.use_count}/{inv.max_uses ?? "∞"}
                            </span>
                            <button
                              className="danger-button compact"
                              disabled={isBusy}
                              onClick={() => handleRevokeInvite(inv.token)}
                              type="button"
                              title="Révoquer cette invitation"
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    <h4>Membres ({members.length})</h4>
                    <div className="member-list">
                      {members.map((m) => (
                        <div className="member-row" key={m.user_id}>
                          <span>{m.display_name}</span>
                          <small>{m.role}</small>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </details>
            )}

            {/* ── CHARACTERS — Fiches Personnages ──────────────────── */}
            {gmView === "characters" && (
              <>
                {liveModePanelIds.has("characters") && (
                  <details className="gm-panel-section" open>
                    <summary>👤 Personnages</summary>
                    <div className="character-section">
                      <button
                        className="primary-button compact"
                        onClick={() => setShowCharacterWizard(true)}
                        style={{ width: "100%", marginBottom: "0.5rem" }}
                        type="button"
                      >
                        ✨ Création assistée
                      </button>

                      <form className="character-form" onSubmit={handleCreateCharacter}>
                        <label>
                          <input
                            name="name"
                            minLength={2}
                            maxLength={120}
                            required
                            placeholder="Nom du personnage"
                          />
                        </label>
                        <div className="mini-grid">
                          <label>
                            <input name="ancestry" maxLength={80} placeholder="Origine" />
                          </label>
                          <label>
                            <input name="class_name" maxLength={80} placeholder="Classe" />
                          </label>
                        </div>
                        <div className="mini-grid">
                          <label>
                            <input
                              name="level"
                              type="number"
                              min={1}
                              max={20}
                              defaultValue={1}
                              placeholder="Niv."
                            />
                          </label>
                          <label>
                            <input
                              name="hp_max"
                              type="number"
                              min={1}
                              defaultValue={10}
                              placeholder="PV"
                            />
                          </label>
                          <label>
                            <input
                              name="armor_class"
                              type="number"
                              min={1}
                              max={40}
                              defaultValue={10}
                              placeholder="CA"
                            />
                          </label>
                          <label>
                            <input
                              name="speed"
                              type="number"
                              min={0}
                              max={200}
                              defaultValue={30}
                              placeholder="Vit."
                            />
                          </label>
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
                              <span>
                                <strong>{ch.name}</strong>
                                <small>
                                  Niv.{ch.level} {ch.class_name}
                                </small>
                              </span>
                              <em>
                                {ch.hp_current}/{ch.hp_max} PV
                              </em>
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
                          onSave={(updated) =>
                            setCharacters((c) => c.map((x) => (x.id === updated.id ? updated : x)))
                          }
                        />
                      )}
                    </div>
                  </details>
                )}

                {/* PartySummaryPanel */}
                {liveModePanelIds.has("party-summary") && (
                  <details className="gm-panel-section">
                    <summary>
                      📊 Résumé du groupe
                      <button
                        className="panel-detach-btn"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          fp.open("party-summary", "📊 Résumé du groupe");
                        }}
                        title="Détacher"
                        type="button"
                      >
                        <ExternalLink size={12} />
                      </button>
                    </summary>
                    <PartySummaryPanel
                      characters={characters}
                      selectedCharacter={selectedCharacter}
                    />
                  </details>
                )}
              </>
            )}

            {/* ── SETTINGS ─────────────────────────────────────────── */}
            {gmView === "settings" && (
              <div className="empty-state compact-empty">
                <p>Paramètres à venir : permissions, layout, thème.</p>
              </div>
            )}
          </aside>
        </ErrorBoundary>
      </Suspense>

      {/* ── Floating Panels ──────────────────────────────────── */}
      {fp.panels.map((panel) => (
        <FloatingPanel
          key={panel.id}
          panel={panel}
          onClose={() => fp.close(panel.id)}
          onMinimize={() => fp.minimize(panel.id)}
          onBringToFront={() => fp.bringToFront(panel.id)}
          onMove={(x, y) => fp.updatePosition(panel.id, x, y)}
          onResize={(w, h) => fp.updateSize(panel.id, w, h)}
        >
          {panel.id === "combat" && (
            <CombatTracker
              campaignId={selectedCampaign?.id ?? ""}
              token={token}
              onEncounterChange={() => void loadCombatState(selectedCampaign?.id ?? "")}
            />
          )}
          {panel.id === "dice-roller" && (
            <DiceRoller onRoll={(formula, lbl, m) => void handleQuickRoll(formula, lbl, m)} />
          )}
          {panel.id === "encounter-builder" && (
            <EncounterBuilder campaignId={selectedCampaign?.id ?? ""} token={token} />
          )}
          {panel.id === "bestiary" && <BestiaryPanel token={token} />}
          {panel.id === "spellbook" && <SpellbookPanel token={token} />}
          {panel.id === "quick-actions" && (
            <QuickActions onRoll={(formula, lbl, m) => void handleQuickRoll(formula, lbl, m)} />
          )}
          {panel.id === "gm-messages" && (
            <GmMessagePanel
              campaignId={selectedCampaign?.id ?? ""}
              token={token}
              members={members}
            />
          )}
          {panel.id === "session-log" && (
            <SessionLogPanel
              characters={characters}
              selectedCharacter={selectedCharacter}
              rolls={rolls}
              logEntries={logEntries}
              isBusy={isBusy}
              token={token}
              onRoll={handleRoll}
              onAddNote={handleLogNote}
              onRefresh={() => {}}
            />
          )}
          {panel.id === "session-stats" && (
            <SessionStats campaignId={selectedCampaign?.id ?? ""} token={token} />
          )}
          {panel.id === "dungeon-generator" && <DungeonGenerator token={token} />}
          {panel.id === "handouts" && (
            <HandoutPanel
              handouts={handouts}
              scenes={scenes}
              isBusy={isBusy}
              campaignId={selectedCampaign?.id ?? ""}
              onCreateHandout={handleCreateHandout}
              onRevealHandout={(h) => void handleRevealHandout(h)}
              onDeleteHandout={(h) => void handleDeleteHandout(h)}
            />
          )}
          {panel.id === "items" && <ItemCompendium token={token} />}
          {panel.id === "homebrew" && (
            <HomebrewPanel
              campaignId={selectedCampaign?.id ?? ""}
              token={token}
              scenes={scenes}
              encounters={encounters}
              isBusy={isBusy}
            />
          )}
          {panel.id === "rules" && <RulesReference />}
          {panel.id === "gm-notes" && (
            <GmNotesPanel
              campaignId={selectedCampaign?.id ?? ""}
              selectedScene={selectedScene}
              selectedToken={sceneTokens.find((t) => t.id === selectedTokenId)}
            />
          )}
          {panel.id === "initiative" && (
            <InitiativePanel sceneId={selectedSceneId} sceneTokens={sceneTokens} />
          )}
          {panel.id === "token-detail" && (
            <TokenDetailPanel
              selectedScene={selectedScene}
              selectedToken={sceneTokens.find((t) => t.id === selectedTokenId)}
              selectedTokenCharacter={characters.find(
                (c) => c.id === sceneTokens.find((t) => t.id === selectedTokenId)?.character_id,
              )}
              selectedTokenPosition={(() => {
                const t = sceneTokens.find((t) => t.id === selectedTokenId);
                return t ? { x: t.x, y: t.y } : undefined;
              })()}
              onDeselectToken={() => setSelectedTokenId("")}
              onNudgeSelectedToken={(dx, dy) => {
                const t = sceneTokens.find((t) => t.id === selectedTokenId);
                if (t) void handleMoveToken(t, dx, dy);
              }}
            />
          )}
          {panel.id === "visibility-inspector" && (
            <VisibilityInspectorPanel
              selectedScene={selectedScene}
              selectedToken={sceneTokens.find((t) => t.id === selectedTokenId)}
              sceneTokens={sceneTokens}
              isGM={true}
              onToggleTokenHidden={handleToggleTokenHidden}
              onOpenPanel={(panelId) => fp.open(panelId, "")}
            />
          )}
          {panel.id === "party-summary" && (
            <PartySummaryPanel characters={characters} selectedCharacter={selectedCharacter} />
          )}
          {panel.id === "chat" && (
            <ChatPanel
              campaignId={selectedCampaign?.id ?? ""}
              wsRef={wsRef}
              userId={user?.id}
              displayName={user?.display_name}
            />
          )}
          {panel.id === "ambiance" && <AmbiancePanel isGM={true} />}
          {panel.id === "npc-generator" && <NpcGenerator />}
          {panel.id === MAP_PANEL_ID && (
            <div className="floating-map-panel">
              <CampaignMap {...campaignMapProps} />
            </div>
          )}
          {panel.id === "scene" && (
            <ScenePanel
              campaignId={selectedCampaign?.id ?? ""}
              token={token}
              scenes={scenes}
              onSelectScene={(id) => setSelectedSceneId(id)}
              onScenesChanged={() => {
                if (selectedCampaign?.id) {
                  void loadVttState(selectedCampaign.id);
                }
              }}
            />
          )}
          {panel.id === "tokens" && (
            <TokenPanel
              campaignId={selectedCampaign?.id ?? ""}
              token={token}
              sceneId={selectedScene?.id ?? ""}
              tokens={sceneTokens}
              onTokensChanged={() => {
                if (selectedScene?.id) {
                  void loadSceneTokens(selectedScene.id);
                }
              }}
            />
          )}
        </FloatingPanel>
      ))}

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
  );
}
