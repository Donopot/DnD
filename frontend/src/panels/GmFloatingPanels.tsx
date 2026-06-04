import { lazy, Suspense } from "react";
import { FloatingPanel } from "../components/FloatingPanel";
import { CampaignMap } from "../components/CampaignMap";
import { useWorkspaceState } from "../contexts/WorkspaceStateContext";
import { useWorkspaceActions } from "../contexts/WorkspaceActionsContext";
import { useVttContext } from "../contexts/VttContext";
import { usePanelContext } from "../contexts/PanelContext";
import { useSessionContext } from "../contexts/SessionContext";

// ── Lazy-loaded heavy panel components ──────────────────────────────────

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
const TokenLibraryPanel = lazy(() =>
  import("../components/TokenLibraryPanel").then((m) => ({ default: m.TokenLibraryPanel })),
);
const ActiveEncounterPanel = lazy(() =>
  import("../components/ActiveEncounterPanel").then((m) => ({ default: m.ActiveEncounterPanel })),
);
const ConditionsPanel = lazy(() =>
  import("../components/ConditionsPanel").then((m) => ({ default: m.ConditionsPanel })),
);

// Eager imports (small enough to stay in the main bundle)
import { GmNotesPanel } from "../components/GmNotesPanel";
import { HandoutPanel } from "../components/HandoutPanel";
import { InitiativePanel } from "../components/InitiativePanel";
import { PartySummaryPanel } from "../components/PartySummaryPanel";
import { QuickActions } from "../components/QuickActions";
import { SessionLogPanel } from "../components/SessionLogPanel";
import { TokenDetailPanel } from "../components/TokenDetailPanel";
import { VisibilityInspectorPanel } from "../components/VisibilityInspectorPanel";

const MAP_PANEL_ID = "campaign-map";

/** Floating panels now read all data from contexts — no more Giant Props Bag. */
export function GmFloatingPanels() {
  const state = useWorkspaceState();
  const actions = useWorkspaceActions();
  const vtt = useVttContext();
  const panel = usePanelContext();
  const session = useSessionContext();

  const {
    token,
    user,
    selectedCampaign,
    members,
    characters,
    selectedCharacter,
    encounters,
    handouts,
    rolls,
    logEntries,
    scenes,
    selectedScene,
    sceneTokens,
    selectedTokenId,
  } = state;

  const {
    handleQuickRoll,
    handleRoll,
    handleLogNote,
    handleCreateHandout,
    handleRevealHandout,
    handleDeleteHandout,
    handleToggleTokenHidden,
    handleMoveToken,
  } = actions;

  const {
    loadCombatState,
    loadSceneTokens,
    loadVttState,
    setSelectedTokenId,
    setSceneTokens,
    setSelectedSceneId,
  } = vtt;

  const { fp } = panel;
  const { wsRef } = session;

  const campaignId = selectedCampaign?.id ?? "";

  return (
    <>
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
          <Suspense fallback={<div className="gm-panel-muted">Chargement…</div>}>
            {panel.id === "combat" && (
              <CombatTracker
                campaignId={campaignId}
                token={token}
                onEncounterChange={() => void loadCombatState(campaignId)}
              />
            )}
            {panel.id === "conditions" && (
              <ConditionsPanel campaignId={campaignId} token={token} />
            )}
            {panel.id === "dice-roller" && (
              <DiceRoller onRoll={(formula, lbl, m) => void handleQuickRoll(formula, lbl, m)} />
            )}
            {panel.id === "active-encounter" && (
              <ActiveEncounterPanel campaignId={campaignId} token={token} />
            )}
            {panel.id === "encounter-builder" && (
              <EncounterBuilder campaignId={campaignId} token={token} />
            )}
            {panel.id === "bestiary" && <BestiaryPanel token={token} />}
            {panel.id === "spellbook" && <SpellbookPanel token={token} />}
            {panel.id === "quick-actions" && (
              <QuickActions onRoll={(formula, lbl, m) => void handleQuickRoll(formula, lbl, m)} />
            )}
            {panel.id === "gm-messages" && (
              <GmMessagePanel campaignId={campaignId} token={token} members={members} />
            )}
            {panel.id === "session-log" && (
              <SessionLogPanel />
            )}
            {panel.id === "session-stats" && (
              <SessionStats campaignId={campaignId} token={token} />
            )}
            {panel.id === "dungeon-generator" && <DungeonGenerator token={token} />}
            {panel.id === "handouts" && (
              <HandoutPanel />
            )}
            {panel.id === "items" && <ItemCompendium token={token} />}
            {panel.id === "homebrew" && (
              <HomebrewPanel
                campaignId={campaignId}
                token={token}
                scenes={scenes}
                encounters={encounters}
                isBusy={false} // isBusy read from PanelContext inside if needed
              />
            )}
            {panel.id === "rules" && <RulesReference />}
            {panel.id === "gm-notes" && (
              <GmNotesPanel
                campaignId={campaignId}
                selectedScene={selectedScene}
                selectedToken={sceneTokens.find((t) => t.id === selectedTokenId)}
              />
            )}
            {panel.id === "initiative" && (
              <InitiativePanel campaignId={campaignId} token={token} />
            )}
            {panel.id === "token-detail" && (
              <TokenDetailPanel />
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
                campaignId={campaignId}
                wsRef={wsRef}
                userId={user?.id}
                displayName={user?.display_name}
              />
            )}
            {panel.id === "ambiance" && <AmbiancePanel isGM={true} />}
            {panel.id === "npc-generator" && <NpcGenerator />}
            {panel.id === MAP_PANEL_ID && (
              <div className="floating-map-panel">
                {/* campaignMapProps comes from VttContext or passed from parent */}
                <CampaignMap {...vtt.campaignMapProps} />
              </div>
            )}
            {panel.id === "scene" && (
              <ScenePanel
                campaignId={campaignId}
                token={token}
                scenes={scenes}
                onSelectScene={(id) => setSelectedSceneId(id)}
                onScenesChanged={() => {
                  if (selectedCampaign?.id) void loadVttState(selectedCampaign.id);
                }}
              />
            )}
            {panel.id === "tokens" && (
              <TokenPanel
                campaignId={campaignId}
                token={token}
                sceneId={selectedScene?.id ?? ""}
                tokens={sceneTokens}
                onTokensChanged={() => {
                  if (selectedScene?.id) void loadSceneTokens(selectedScene.id);
                }}
              />
            )}
            {panel.id === "token-library" && (
              <TokenLibraryPanel
                campaignId={campaignId}
                token={token}
                selectedSceneId={selectedScene?.id}
                onTokensChanged={() => {
                  if (selectedScene?.id) void loadSceneTokens(selectedScene.id);
                }}
              />
            )}
          </Suspense>
        </FloatingPanel>
      ))}
    </>
  );
}
