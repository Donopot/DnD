import { DoorOpen, Maximize2, Minimize2, PanelRightClose, PanelRightOpen, Swords, UserPlus } from "lucide-react";
import { Suspense } from "react";
import type {
  Campaign,
  Character,
  Encounter,
  GameLogEntry,
  Handout,
  Invite,
  Member,
  Roll,
  Scene,
  SceneToken,
  User,
} from "../api/types";
import type { CampaignView } from "../components/CampaignViewTabs";
import { CampaignMap, type CampaignMapProps } from "../components/CampaignMap";
import { CampaignViewTabs } from "../components/CampaignViewTabs";
import { PanelDock } from "../components/PanelDock";
import { GmDockedPanels } from "../panels/GmDockedPanels";
import { GmFloatingPanels } from "../panels/GmFloatingPanels";
import type { SessionLiveMode } from "../config/sessionLiveModes";
import { SESSION_LIVE_MODES } from "../config/sessionLiveModes";
import { useFloatingPanels } from "../hooks/useFloatingPanels";

// ── Props ───────────────────────────────────────────────────────────────────

export type GmWorkspaceProps = {
  // ── Auth & user
  token: string;
  user: User | null;

  // ── Campaign state
  campaigns: Campaign[];
  selectedCampaign: Campaign | undefined;
  members: Member[];
  characters: Character[];
  selectedCharacter: Character | undefined;
  encounters: Encounter[];
  handouts: Handout[];
  rolls: Roll[];
  logEntries: GameLogEntry[];
  latestInvite: Invite | null;
  activeInvites: Invite[];

  // ── VTT state
  scenes: Scene[];
  selectedScene: Scene | undefined;
  selectedSceneId: string;
  sceneTokens: SceneToken[];
  selectedTokenId: string;
  selectedCharacterId: string;
  inspectedCharacterId: string;

  // ── UI state
  showCharacterWizard: boolean;
  showShortcuts: boolean;
  isBusy: boolean;
  isFocusMap: boolean;
  isPanelsHidden: boolean;
  gmView: CampaignView;
  activeSessionLiveMode: SessionLiveMode;
  liveModePanelIds: Set<string>;
  presenceCount: number;
  realtimeStatus: string;

  // ── Floating panels
  fp: ReturnType<typeof useFloatingPanels>;

  // ── Theme & toasts
  theme: string;
  toggleTheme: () => void;
  toasts: { id: number; message: string; type?: string }[];
  dismissToast: (id: number) => void;

  // ── Computed props
  campaignMapProps: CampaignMapProps;
  isMapFloating: boolean;

  // ── WebSocket
  wsRef: React.RefObject<WebSocket | null>;

  // ── Handlers
  onLogout: () => void;
  handleQuickRoll: (formula: string, label: string, mode: "normal" | "advantage" | "disadvantage") => void;
  handleRoll: (e: React.FormEvent<HTMLFormElement>) => void;
  handleLogNote: (e: React.FormEvent<HTMLFormElement>) => void;
  handleCreateHandout: (e: React.FormEvent<HTMLFormElement>) => void;
  handleRevealHandout: (handout: Handout) => Promise<void>;
  handleDeleteHandout: (handout: Handout) => Promise<void>;
  handleToggleTokenHidden: (token: SceneToken) => Promise<void>;
  handleMoveToken: (token: SceneToken, dx: number, dy: number) => Promise<void>;
  handleCreateCharacter: (e: React.FormEvent<HTMLFormElement>) => void;
  handleCreateInvite: () => void;
  handleRevokeInvite: (token: string) => void;

  // ── Setters
  setSelectedCampaignId: (id: string) => void;
  setSelectedTokenId: React.Dispatch<React.SetStateAction<string>>;
  setSelectedCharacterId: React.Dispatch<React.SetStateAction<string>>;
  setSelectedSceneId: React.Dispatch<React.SetStateAction<string>>;
  setInspectedCharacterId: React.Dispatch<React.SetStateAction<string>>;
  setShowCharacterWizard: React.Dispatch<React.SetStateAction<boolean>>;
  setShowShortcuts: React.Dispatch<React.SetStateAction<boolean>>;
  setIsFocusMap: React.Dispatch<React.SetStateAction<boolean>>;
  setIsPanelsHidden: React.Dispatch<React.SetStateAction<boolean>>;
  setGmView: React.Dispatch<React.SetStateAction<CampaignView>>;
  setActiveSessionLiveMode: React.Dispatch<React.SetStateAction<SessionLiveMode>>;
  setSceneTokens: React.Dispatch<React.SetStateAction<SceneToken[]>>;
  setCharacters: React.Dispatch<React.SetStateAction<Character[]>>;
  setLogEntries: React.Dispatch<React.SetStateAction<GameLogEntry[]>>;
  setLatestInvite?: React.Dispatch<React.SetStateAction<Invite | null>>;

  // ── Async callbacks
  loadCombatState: (campaignId: string) => Promise<void>;
  loadSceneTokens: (sceneId: string) => Promise<void>;
  loadVttState: (campaignId: string) => Promise<void>;
  loadCharacters: (campaignId: string) => Promise<void>;
  loadInvites?: (campaignId?: string) => Promise<void>;
};

// ── Lazy-loaded heavy components ────────────────────────────────────────────
import { lazy } from "react";
const GmCharacterInspector = lazy(() =>
  import("../components/GmCharacterInspector").then((m) => ({ default: m.GmCharacterInspector })),
);
const CharacterWizard = lazy(() =>
  import("../components/CharacterWizard").then((m) => ({ default: m.CharacterWizard })),
);
const KeyboardShortcuts = lazy(() =>
  import("../components/KeyboardShortcuts").then((m) => ({ default: m.KeyboardShortcuts })),
);

const MAP_PANEL_ID = "campaign-map";

const PanelFallback = () => (
  <div className="panel-loading">
    <div className="skeleton skeleton-title" />
    <div className="skeleton skeleton-text" />
    <div className="skeleton skeleton-text short" />
    <div className="skeleton skeleton-text" />
  </div>
);

// ── Component ───────────────────────────────────────────────────────────────

export function GmWorkspace(props: GmWorkspaceProps) {
  const {
    token,
    user,
    campaigns,
    selectedCampaign,
    members,
    characters,
    selectedCharacter,
    encounters,
    handouts,
    rolls,
    logEntries,
    latestInvite,
    activeInvites,
    scenes,
    selectedScene,
    selectedSceneId,
    sceneTokens,
    selectedTokenId,
    selectedCharacterId,
    inspectedCharacterId,
    showCharacterWizard,
    showShortcuts,
    isBusy,
    isFocusMap,
    isPanelsHidden,
    gmView,
    activeSessionLiveMode,
    liveModePanelIds,
    presenceCount,
    realtimeStatus,
    fp,
    theme,
    toggleTheme,
    toasts,
    dismissToast,
    onLogout,
    wsRef,
    handleQuickRoll,
    handleRoll,
    handleLogNote,
    handleCreateHandout,
    handleRevealHandout,
    handleDeleteHandout,
    handleToggleTokenHidden,
    handleMoveToken,
    handleCreateCharacter,
    handleCreateInvite,
    handleRevokeInvite,
    setSelectedCampaignId,
    setSelectedTokenId,
    setSelectedCharacterId,
    setSelectedSceneId,
    setInspectedCharacterId,
    setShowCharacterWizard,
    setShowShortcuts,
    setIsFocusMap,
    setIsPanelsHidden,
    setGmView,
    setActiveSessionLiveMode,
    setSceneTokens,
    setCharacters,
    setLogEntries,
    setLatestInvite,
    loadCombatState,
    loadSceneTokens,
    loadVttState,
    loadCharacters,
    loadInvites,
    campaignMapProps,
    isMapFloating,
  } = props;

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
                if (setLatestInvite) setLatestInvite(null);
                if (loadInvites) { void loadInvites(c.id); }
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
          <button className="ghost-button compact" onClick={onLogout} type="button">
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
        setLogEntries={setLogEntries}
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
  );
}
