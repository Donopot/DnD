import { Suspense, useRef } from "react";
import { FloatingPanel } from "../components/FloatingPanel";
import { useWorkspaceState } from "../contexts/WorkspaceStateContext";
import { useWorkspaceActions } from "../contexts/WorkspaceActionsContext";
import { useVttContext } from "../contexts/VttContext";
import { usePanelContext } from "../contexts/PanelContext";
import { useSessionContext } from "../contexts/SessionContext";
import { PanelFallback, renderGmPanelContent } from "./panelRenderer";

/** Floating panels now read all data from contexts — no more Giant Props Bag. */
export function GmFloatingPanels() {
  const state = useWorkspaceState();
  const actions = useWorkspaceActions();
  const vtt = useVttContext();
  const panel = usePanelContext();
  const session = useSessionContext();

  const logRefreshAbortRef = useRef<AbortController | null>(null);

  return (
    <>
      {panel.fp.panels.map((p) => (
        <FloatingPanel
          key={p.id}
          panel={p}
          onClose={() => panel.fp.close(p.id)}
          onMinimize={() => panel.fp.minimize(p.id)}
          onBringToFront={() => panel.fp.bringToFront(p.id)}
          onMove={(x, y) => panel.fp.updatePosition(p.id, x, y)}
          onResize={(w, h) => panel.fp.updateSize(p.id, w, h)}
        >
          <Suspense fallback={<PanelFallback />}>
            {renderGmPanelContent(p.id, {
              selectedCampaign: state.selectedCampaign,
              token: state.token,
              scenes: state.scenes,
              encounters: state.encounters,
              sceneTokens: state.sceneTokens,
              selectedScene: state.selectedScene,
              selectedSceneId: state.selectedSceneId,
              selectedTokenId: state.selectedTokenId,
              characters: state.characters,
              selectedCharacter: state.selectedCharacter,
              handouts: state.handouts,
              rolls: state.rolls,
              logEntries: state.logEntries,
              members: state.members,
              wsRef: session.wsRef,
              user: state.user,
              isBusy: panel.isBusy,
              campaignMapProps: vtt.campaignMapProps,
              handleQuickRoll: actions.handleQuickRoll,
              handleRoll: actions.handleRoll,
              handleLogNote: actions.handleLogNote,
              handleCreateHandout: actions.handleCreateHandout,
              handleRevealHandout: actions.handleRevealHandout,
              handleDeleteHandout: actions.handleDeleteHandout,
              handleToggleTokenHidden: actions.handleToggleTokenHidden,
              handleMoveToken: actions.handleMoveToken,
              loadCombatState: vtt.loadCombatState,
              loadSceneTokens: vtt.loadSceneTokens,
              loadVttState: vtt.loadVttState,
              setSelectedTokenId: vtt.setSelectedTokenId,
              setSceneTokens: vtt.setSceneTokens,
              setSelectedSceneId: vtt.setSelectedSceneId,
              setLogEntries: panel.setLogEntries as any,
              logRefreshAbortRef,
            })}
          </Suspense>
        </FloatingPanel>
      ))}
    </>
  );
}
