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
import { type FormEvent, lazy, Suspense, useCallback, useEffect, useMemo, useState } from "react";
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
import { useVttState } from "./hooks/useVttState";
import { useTokenActions } from "./hooks/useTokenActions";
import { useRealtimeSession } from "./hooks/useRealtimeSession";
import { useSessionJournal } from "./hooks/useSessionJournal";
import { useHandouts } from "./hooks/useHandouts";
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
  AuthResponse,
  Character,
  Handout,
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

  const vtt = useVttState(token);
  const {
    scenes, selectedSceneId, selectedScene, sceneTokens,
    encounters, selectedEncounterId,
  } = vtt;

  const [characters, setCharacters] = useState<Character[]>([]);
  const [selectedCharacterId, setSelectedCharacterId] = useState<string>("");
  const [selectedTokenId, setSelectedTokenId] = useState<string>("");
  const [inspectedCharacterId, setInspectedCharacterId] = useState<string>("");
  const [showCharacterWizard, setShowCharacterWizard] = useState(false);
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

  const ws = useRealtimeSession({
    token,
    campaignId: selectedCampaign?.id,
    selectedSceneId: selectedScene?.id,
    onError: setMessage,
    onSessionSceneToken: () => { void vtt.loadVttState(selectedCampaign!.id); },
    onSessionEncounter: () => { void vtt.loadCombatState(selectedCampaign!.id); },
    onSessionHandout: () => { void loadHandouts(selectedCampaign!.id); },
    onSessionLog: () => { void loadSessionLog(selectedCampaign!.id); },
    onTokenMoved: (tokenId, x, y) => {
      vtt.setSceneTokens((current) =>
        current.map((t) => (t.id === tokenId ? { ...t, x, y } : t)),
      );
    },
  });
  const { presenceCount, realtimeStatus } = ws;

  const journal = useSessionJournal({
    token,
    onError: setMessage,
    onBusyStart: () => { setIsBusy(true); setMessage(""); },
    onBusyEnd: () => setIsBusy(false),
  });
  const { rolls, logEntries, setLogEntries, loadSessionLog, doRoll, quickRoll, addLogNote, clearJournal } =
    journal;

  const handoutsHook = useHandouts({
    token,
    onError: setMessage,
    onBusyStart: () => { setIsBusy(true); setMessage(""); },
    onBusyEnd: () => setIsBusy(false),
  });
  const { handouts, loadHandouts, createHandout, revealHandout, deleteHandout } = handoutsHook;

  const tokenActions = useTokenActions({
    token,
    selectedScene,
    setSceneTokens: vtt.setSceneTokens,
    performTokenAction: vtt.performTokenAction,
    onError: setMessage,
    onStart: () => { setIsBusy(true); setMessage(""); },
    onEnd: () => setIsBusy(false),
  });

  const selectedCharacter = useMemo(
    () => characters.find((character) => character.id === selectedCharacterId) ?? characters[0],
    [characters, selectedCharacterId],
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
      wsRef: ws.wsRef,
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
      onSelectScene: vtt.setSelectedSceneId,
      selectedTokenId,
      onSelectToken: setSelectedTokenId,
      onLoadSceneTokens: (id: string) => void vtt.loadSceneTokens(id),
      onMoveToken: (t: SceneToken, dx: number, dy: number) => void tokenActions.moveToken(t, dx, dy),
      onTokenAction: (action: string, t: SceneToken, v?: number) =>
        void handleTokenAction(action, t, v),
      onTokenBatchAction: (action: string, ts: SceneToken[], v?: number) =>
        void handleTokenBatchAction(action, ts, v),
    };
  }, [
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
      clearJournal();
      return;
    }
    campaign.selectCampaign(selectedCampaign.id);
    void campaign.loadMembers(selectedCampaign.id);
    void loadCharacters(selectedCampaign.id);
    void loadSessionLog(selectedCampaign.id);
    void vtt.loadVttState(selectedCampaign.id);
    void vtt.loadAssets(selectedCampaign.id);
    void vtt.loadCombatState(selectedCampaign.id);
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

  // Per-token action wrapper (handles "add-combat" locally)
  async function handleTokenAction(action: string, tokenToAct: SceneToken, value?: number) {
    if (action === "add-combat") {
      setMessage("Ajout au combat : ouvre le Générateur de rencontres pour ajouter ce token.");
      return;
    }
    await tokenActions.wrapSingle(action, tokenToAct, value);
  }

  // Sequential batch action handler
  async function handleTokenBatchAction(action: string, tokens: SceneToken[], value?: number) {
    await tokenActions.wrapBatch(action, tokens, value);
  }

  async function handleToggleTokenHidden(tokenToToggle: SceneToken) {
    try {
      await vtt.handleToggleTokenHidden(tokenToToggle);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Impossible de changer la visibilité",
      );
    }
  }


  async function handleCreateHandout(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedCampaign) return;
    const form = new FormData(event.currentTarget);
    await createHandout(
      selectedCampaign.id,
      String(form.get("title")),
      String(form.get("content") || ""),
      String(form.get("visibility") || "gm"),
      String(form.get("scene_id") || "") || null,
    );
    event.currentTarget.reset();
  }

  async function handleDeleteHandout(handout: Handout) {
    if (!confirm(`Supprimer le handout "${handout.title}" ?`)) return;
    await deleteHandout(handout);
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
      clearJournal();
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
      selectedCampaign.id,
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
    await quickRoll(selectedCampaign.id, formula, label, mode, selectedCharacter?.id ?? "");
  }

  async function handleLogNote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedCampaign) return;
    const form = new FormData(event.currentTarget);
    await addLogNote(
      selectedCampaign.id,
      String(form.get("message")),
      String(form.get("visibility")),
    );
    event.currentTarget.reset();
  }

  function logout() {
    ws.wsRef.current?.close();
    authLogout();
    campaign.clearCampaigns();
    campaign.clearMembers();
    setCharacters([]);
    clearJournal();
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
            wsRef={ws.wsRef}
            user={user}
            isBusy={isBusy}
            latestInvite={latestInvite}
            activeInvites={activeInvites}
            handleQuickRoll={handleQuickRoll}
            handleRoll={handleRoll}
            handleLogNote={handleLogNote}
            handleCreateHandout={handleCreateHandout}
            handleRevealHandout={revealHandout}
            handleDeleteHandout={handleDeleteHandout}
            handleToggleTokenHidden={handleToggleTokenHidden}
            handleMoveToken={tokenActions.moveToken}
            handleCreateCharacter={handleCreateCharacter}
            handleCreateInvite={handleCreateInvite}
            handleRevokeInvite={handleRevokeInvite}
            setSelectedTokenId={setSelectedTokenId}
            setSceneTokens={vtt.setSceneTokens}
            setSelectedSceneId={vtt.setSelectedSceneId}
            setSelectedCharacterId={setSelectedCharacterId}
            setInspectedCharacterId={setInspectedCharacterId}
            setShowCharacterWizard={setShowCharacterWizard}
            setCharacters={setCharacters}
            setLogEntries={setLogEntries}
            loadCombatState={vtt.loadCombatState}
            loadSceneTokens={vtt.loadSceneTokens}
            loadVttState={vtt.loadVttState}
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
        wsRef={ws.wsRef}
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
        handleRevealHandout={revealHandout}
        handleDeleteHandout={handleDeleteHandout}
        handleToggleTokenHidden={handleToggleTokenHidden}
        handleMoveToken={tokenActions.moveToken}
        loadCombatState={vtt.loadCombatState}
        loadSceneTokens={vtt.loadSceneTokens}
        loadVttState={vtt.loadVttState}
        setSelectedTokenId={setSelectedTokenId}
        setSceneTokens={vtt.setSceneTokens}
        setSelectedSceneId={vtt.setSelectedSceneId}
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
