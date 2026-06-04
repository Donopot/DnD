import { useRef } from "react";
import { useWorkspaceState } from "../contexts/WorkspaceStateContext";
import { useWorkspaceActions } from "../contexts/WorkspaceActionsContext";
import { useVttContext } from "../contexts/VttContext";
import { usePanelContext } from "../contexts/PanelContext";
import { useSessionContext } from "../contexts/SessionContext";
import { getDockedPanelsForView, renderDockedPanel } from "./panelRenderer";

/** Docked panels read all data from contexts — no more Giant Props Bag. */
export function GmDockedPanels() {
  const state = useWorkspaceState();
  const actions = useWorkspaceActions();
  const vtt = useVttContext();
  const panel = usePanelContext();
  const session = useSessionContext();

  const logRefreshAbortRef = useRef<AbortController | null>(null);
  const panels = getDockedPanelsForView(panel.gmView, panel.liveModePanelIds);

  // Build GmPanelRenderProps from contexts
  const renderProps = {
    fpOpen: (id: string, title: string) => panel.fp.open(id, title),
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
    latestInvite: state.latestInvite,
    activeInvites: state.activeInvites,
    handleQuickRoll: actions.handleQuickRoll,
    handleRoll: actions.handleRoll,
    handleLogNote: actions.handleLogNote,
    handleCreateHandout: actions.handleCreateHandout,
    handleRevealHandout: actions.handleRevealHandout,
    handleDeleteHandout: actions.handleDeleteHandout,
    handleToggleTokenHidden: actions.handleToggleTokenHidden,
    handleMoveToken: actions.handleMoveToken,
    handleCreateCharacter: actions.handleCreateCharacter,
    handleCreateInvite: actions.handleCreateInvite,
    handleRevokeInvite: actions.handleRevokeInvite,
    setSelectedTokenId: vtt.setSelectedTokenId,
    setSceneTokens: vtt.setSceneTokens,
    setSelectedSceneId: vtt.setSelectedSceneId,
    setSelectedCharacterId: panel.setSelectedCharacterId,
    setInspectedCharacterId: panel.setInspectedCharacterId,
    setShowCharacterWizard: panel.setShowCharacterWizard,
    setCharacters: panel.setCharacters as any,
    setLogEntries: panel.setLogEntries as any,
    loadCombatState: vtt.loadCombatState,
    loadSceneTokens: vtt.loadSceneTokens,
    loadVttState: vtt.loadVttState,
    logRefreshAbortRef,
  };

  return (
    <>
      {panels.map((panel) => renderDockedPanel(panel, renderProps))}
    </>
  );
}
