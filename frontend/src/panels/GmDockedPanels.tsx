import {
  ExternalLink,
  Plus,
  UserPlus,
} from "lucide-react";
import { type FormEvent, lazy, Suspense, useRef } from "react";
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

// ── Lazy-loaded heavy components ────────────────────────────────────────
const CombatTracker = lazy(() =>
  import("../components/CombatTracker").then((m) => ({ default: m.CombatTracker })),
);
const DiceRoller = lazy(() =>
  import("../components/DiceRoller").then((m) => ({ default: m.DiceRoller })),
);
const EncounterBuilder = lazy(() =>
  import("../components/EncounterBuilder").then((m) => ({ default: m.EncounterBuilder })),
);
const SessionStats = lazy(() =>
  import("../components/SessionStats").then((m) => ({ default: m.SessionStats })),
);
const HomebrewPanel = lazy(() =>
  import("../components/HomebrewPanel").then((m) => ({ default: m.HomebrewPanel })),
);
const RulesReference = lazy(() =>
  import("../components/RulesReference").then((m) => ({ default: m.RulesReference })),
);
const GmMessagePanel = lazy(() =>
  import("../components/GmMessagePanel").then((m) => ({ default: m.GmMessagePanel })),
);
const BestiaryPanel = lazy(() =>
  import("../components/BestiaryPanel").then((m) => ({ default: m.BestiaryPanel })),
);
const SpellbookPanel = lazy(() =>
  import("../components/SpellbookPanel").then((m) => ({ default: m.SpellbookPanel })),
);
const DungeonGenerator = lazy(() =>
  import("../components/DungeonGenerator").then((m) => ({ default: m.DungeonGenerator })),
);
const ItemCompendium = lazy(() =>
  import("../components/ItemCompendium").then((m) => ({ default: m.ItemCompendium })),
);
const NpcGenerator = lazy(() =>
  import("../components/NpcGenerator").then((m) => ({ default: m.default })),
);
const ChatPanel = lazy(() =>
  import("../components/ChatPanel").then((m) => ({ default: m.default })),
);
const AmbiancePanel = lazy(() =>
  import("../components/AmbiancePanel").then((m) => ({ default: m.AmbiancePanel })),
);
const ScenePanel = lazy(() =>
  import("../components/ScenePanel").then((m) => ({ default: m.ScenePanel })),
);
const TokenPanel = lazy(() =>
  import("../components/TokenPanel").then((m) => ({ default: m.TokenPanel })),
);
const ActiveEncounterPanel = lazy(() =>
  import("../components/ActiveEncounterPanel").then((m) => ({ default: m.ActiveEncounterPanel })),
);

// ── Eager imports (small enough to stay in the main bundle) ────────────
import { EditCharacterSheet } from "../components/EditCharacterSheet";
import { GmNotesPanel } from "../components/GmNotesPanel";
import { HandoutPanel } from "../components/HandoutPanel";
import { InitiativePanel } from "../components/InitiativePanel";
import { PartySummaryPanel } from "../components/PartySummaryPanel";
import { QuickActions } from "../components/QuickActions";
import { SessionLogPanel } from "../components/SessionLogPanel";
import { TokenDetailPanel } from "../components/TokenDetailPanel";
import { VisibilityInspectorPanel } from "../components/VisibilityInspectorPanel";

const PanelFallback = () => (
  <div className="panel-loading">
    <div className="skeleton skeleton-title" />
    <div className="skeleton skeleton-text" />
    <div className="skeleton skeleton-text short" />
    <div className="skeleton skeleton-text" />
  </div>
);

// ── Props ───────────────────────────────────────────────────────────────

export type GmDockedPanelsProps = {
  gmView: CampaignView;
  liveModePanelIds: Set<string>;
  fpOpen: (id: string, title: string) => void;
  selectedCampaign: Campaign | undefined;
  token: string;
  scenes: Scene[];
  sceneTokens: SceneToken[];
  selectedScene: Scene | undefined;
  selectedTokenId: string;
  characters: Character[];
  selectedCharacter: Character | undefined;
  handouts: Handout[];
  rolls: Roll[];
  logEntries: GameLogEntry[];
  members: Member[];
  encounters: Encounter[];
  wsRef: React.RefObject<WebSocket | null>;
  user: User | null;
  isBusy: boolean;
  latestInvite: Invite | null;
  activeInvites: Invite[];

  // Handlers
  handleQuickRoll: (formula: string, label: string, mode: "normal" | "advantage" | "disadvantage") => void;
  handleRoll: (e: FormEvent<HTMLFormElement>) => void;
  handleLogNote: (e: FormEvent<HTMLFormElement>) => void;
  handleCreateHandout: (e: FormEvent<HTMLFormElement>) => void;
  handleRevealHandout: (handout: Handout) => Promise<void>;
  handleDeleteHandout: (handout: Handout) => Promise<void>;
  handleToggleTokenHidden: (token: SceneToken) => Promise<void>;
  handleMoveToken: (token: SceneToken, dx: number, dy: number) => Promise<void>;
  handleCreateCharacter: (e: FormEvent<HTMLFormElement>) => void;
  handleCreateInvite: () => void;
  handleRevokeInvite: (token: string) => void;

  // Setters
  setSelectedTokenId: React.Dispatch<React.SetStateAction<string>>;
  setSceneTokens: React.Dispatch<React.SetStateAction<SceneToken[]>>;
  setSelectedSceneId: React.Dispatch<React.SetStateAction<string>>;
  setSelectedCharacterId: React.Dispatch<React.SetStateAction<string>>;
  setInspectedCharacterId: React.Dispatch<React.SetStateAction<string>>;
  setShowCharacterWizard: React.Dispatch<React.SetStateAction<boolean>>;
  setCharacters: React.Dispatch<React.SetStateAction<Character[]>>;
  setLogEntries: React.Dispatch<React.SetStateAction<GameLogEntry[]>>;

  // Async callbacks
  loadCombatState: (campaignId: string) => Promise<void>;
  loadSceneTokens: (sceneId: string) => Promise<void>;
  loadVttState: (campaignId: string) => Promise<void>;
};

// ── Component ───────────────────────────────────────────────────────────

export function GmDockedPanels(props: GmDockedPanelsProps) {
  const {
    gmView,
    liveModePanelIds,
    fpOpen,
    selectedCampaign,
    token,
    scenes,
    sceneTokens,
    selectedScene,
    selectedTokenId,
    characters,
    selectedCharacter,
    handouts,
    rolls,
    logEntries,
    members,
    encounters,
    wsRef,
    user,
    isBusy,
    latestInvite,
    activeInvites,
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
    setSelectedTokenId,
    setSceneTokens,
    setSelectedSceneId,
    setSelectedCharacterId,
    setInspectedCharacterId,
    setShowCharacterWizard,
    setCharacters,
    setLogEntries,
    loadCombatState,
    loadSceneTokens,
    loadVttState,
  } = props;

  // AbortController for session-log refresh
  const logRefreshAbortRef = useRef<AbortController | null>(null);

  return (
    <>
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
                    fpOpen("combat", "⚔️ Combat");
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

          {/* Active Encounter */}
          {liveModePanelIds.has("active-encounter") && (
            <details className="gm-panel-section" open>
              <summary>
                ⚔️ Rencontre active
                <button
                  className="panel-detach-btn"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    fpOpen("active-encounter", "⚔️ Rencontre active");
                  }}
                  title="Détacher en panneau flottant"
                  type="button"
                >
                  <ExternalLink size={12} />
                </button>
              </summary>
              <ActiveEncounterPanel
                campaignId={selectedCampaign?.id ?? ""}
                token={token}
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
                    fpOpen("encounter-builder", "🧩 Rencontres");
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
                    fpOpen("dice-roller", "🎲 Lancer de dés");
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

          {/* Quick Actions */}
          {liveModePanelIds.has("quick-actions") && (
            <details className="gm-panel-section">
              <summary>
                ⚡ Actions rapides
                <button
                  className="panel-detach-btn"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    fpOpen("quick-actions", "⚡ Actions rapides");
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

          {/* Messages GM → Joueurs */}
          {liveModePanelIds.has("gm-messages") && (
            <details className="gm-panel-section">
              <summary>
                💬 Communication
                <button
                  className="panel-detach-btn"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    fpOpen("gm-messages", "💬 Communication");
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
                    fpOpen("chat", "💭 Chat");
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
                    fpOpen("ambiance", "🎵 Ambiance");
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
                    fpOpen("gm-notes", "📝 Notes MJ");
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
                    fpOpen("initiative", "⏱️ Initiative");
                  }}
                  title="Détacher"
                  type="button"
                >
                  <ExternalLink size={12} />
                </button>
              </summary>
              <InitiativePanel campaignId={selectedCampaign?.id ?? ""} token={token} />
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
                    fpOpen("token-detail", "🔍 Détail token");
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
                token={token}
                onDeselectToken={() => setSelectedTokenId("")}
                onNudgeSelectedToken={(dx, dy) => {
                  const t = sceneTokens.find((t) => t.id === selectedTokenId);
                  if (t) void handleMoveToken(t, dx, dy);
                }}
                onTokenUpdated={(updated) => {
                  setSceneTokens((current) => {
                    if (!updated) return current;
                    return current.some((t) => t.id === updated.id)
                      ? current.map((t) => (t.id === updated.id ? updated : t))
                      : [...current, updated];
                  });
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
                    fpOpen("visibility-inspector", "👁️ Visibilité");
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
                onOpenPanel={(panelId) => fpOpen(panelId, "")}
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
                    fpOpen("session-log", "📋 Journal");
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
                        // Abort any previous in-flight refresh
                        logRefreshAbortRef.current?.abort();
                        const controller = new AbortController();
                        logRefreshAbortRef.current = controller;

                        const url = category
                          ? `/api/campaigns/${selectedCampaign.id}/log?limit=100&category=${category}`
                          : `/api/campaigns/${selectedCampaign.id}/log?limit=100`;
                        const response = await fetch(url, {
                          headers: { Authorization: `Bearer ${token}` },
                          signal: controller.signal,
                        });
                        if (response.ok) setLogEntries(await response.json());
                      } catch (err) {
                        if (err instanceof DOMException && err.name === "AbortError") return;
                        /* ignore other errors */
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
                    fpOpen("session-stats", "📊 Statistiques");
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
                    fpOpen("scene", "🎬 Scènes");
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
                    fpOpen("tokens", "🎭 Tokens");
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
                    fpOpen("dungeon-generator", "🗺️ Donjons");
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
                    fpOpen("handouts", "📄 Documents");
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

      {/* ── LIBRARY — Bestiaire, Sorts, Équipement ─────────── */}
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
                    fpOpen("bestiary", "💀 Bestiaire");
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
                    fpOpen("spellbook", "✨ Grimoire");
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
                    fpOpen("items", "🎒 Équipement");
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
                    fpOpen("homebrew", "📚 Bibliothèque");
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
                    fpOpen("rules", "📖 Règles SRD");
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
                    fpOpen("npc-generator", "🧑 Générateur PNJ");
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

      {/* ── CAMPAIGN — Infos, Membres ──────────────────────── */}
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

      {/* ── CHARACTERS — Fiches Personnages ─────────────────── */}
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
                    fpOpen("party-summary", "📊 Résumé du groupe");
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

      {/* ── SETTINGS ────────────────────────────────────────── */}
      {gmView === "settings" && (
        <div className="empty-state compact-empty">
          <p>Paramètres à venir : permissions, layout, thème.</p>
        </div>
      )}
    </>
  );
}
