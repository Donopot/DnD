import { useMemo, type ReactNode } from "react";
import type { CampaignView } from "../components/CampaignViewTabs";
import type { SessionLiveMode } from "../config/sessionLiveModes";
import { useFloatingPanels } from "../hooks/useFloatingPanels";
import { WorkspaceStateContext, type WorkspaceState } from "./WorkspaceStateContext";
import { WorkspaceActionsContext, type WorkspaceActions } from "./WorkspaceActionsContext";
import { VttContext, type VttContextValue } from "./VttContext";
import { PanelContext, type PanelContextValue } from "./PanelContext";
import { SessionContext, type SessionContextValue } from "./SessionContext";
import type { CampaignMapProps } from "../components/CampaignMap";

export interface GmWorkspaceProviderProps {
  // ── State
  state: WorkspaceState;
  // ── Actions
  actions: WorkspaceActions;
  // ── VTT
  vtt: VttContextValue;
  // ── Campaign map
  campaignMapProps: CampaignMapProps;
  isMapFloating: boolean;
  // ── Panel state
  panel: PanelContextValue;
  // ── Session
  session: SessionContextValue;
  // ── Children
  children: ReactNode;
}

/**
 * Composes all 5 domain contexts into a single provider tree.
 * Each panel subscribes only to the contexts it needs via useWorkspaceState(),
 * useWorkspaceActions(), useVttContext(), usePanelContext(), useSessionContext().
 */
export function GmWorkspaceProvider(props: GmWorkspaceProviderProps) {
  const { state, actions, vtt, campaignMapProps, isMapFloating, panel, session, children } = props;

  // Stabilize context values so panels only re-render when their domain changes
  const stateValue = useMemo(() => state, [
    state.token, state.user, state.campaigns, state.selectedCampaign,
    state.members, state.characters, state.selectedCharacter,
    state.encounters, state.handouts, state.rolls, state.logEntries,
    state.latestInvite, state.activeInvites,
    state.scenes, state.selectedScene, state.selectedSceneId,
    state.sceneTokens, state.selectedTokenId,
  ]);

  const actionsValue = useMemo(() => actions, [
    actions.handleCreateHandout, actions.handleRevealHandout, actions.handleDeleteHandout,
    actions.handleRoll, actions.handleQuickRoll, actions.handleLogNote,
    actions.handleToggleTokenHidden, actions.handleMoveToken,
    actions.handleCreateCharacter, actions.handleCreateInvite, actions.handleRevokeInvite,
    actions.onLogout,
  ]);

  const vttValue = useMemo(() => vtt, [
    vtt.selectedSceneId, vtt.selectedScene, vtt.sceneTokens, vtt.selectedTokenId,
    vtt.sceneBackgroundObjectUrl, vtt.campaignMapProps,
  ]);

  const panelValue = useMemo(() => panel, [
    panel.gmView, panel.activeSessionLiveMode, panel.liveModePanelIds,
    panel.isPanelsHidden, panel.isFocusMap, panel.fp,
    panel.selectedCharacterId, panel.inspectedCharacterId,
    panel.showCharacterWizard, panel.showShortcuts,
    panel.isBusy,
  ]);

  const sessionValue = useMemo(() => session, [
    session.presenceCount, session.realtimeStatus, session.wsRef,
    session.theme, session.toasts,
  ]);

  return (
    <WorkspaceStateContext.Provider value={stateValue}>
      <WorkspaceActionsContext.Provider value={actionsValue}>
        <VttContext.Provider value={vttValue}>
          <PanelContext.Provider value={panelValue}>
            <SessionContext.Provider value={sessionValue}>
              {children}
            </SessionContext.Provider>
          </PanelContext.Provider>
        </VttContext.Provider>
      </WorkspaceActionsContext.Provider>
    </WorkspaceStateContext.Provider>
  );
}
