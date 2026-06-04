import { createContext, useContext } from "react";
import type { CampaignView } from "../components/CampaignViewTabs";
import type { SessionLiveMode } from "../config/sessionLiveModes";
import type { useFloatingPanels } from "../hooks/useFloatingPanels";
import type React from "react";

/**
 * Panel & layout state — tabs, modes, visibility, floating panels.
 * Changing gmView or session mode doesn't re-render map or data.
 */
export interface PanelContextValue {
  gmView: CampaignView;
  setGmView: React.Dispatch<React.SetStateAction<CampaignView>>;
  activeSessionLiveMode: SessionLiveMode;
  setActiveSessionLiveMode: React.Dispatch<React.SetStateAction<SessionLiveMode>>;
  liveModePanelIds: Set<string>;
  isPanelsHidden: boolean;
  setIsPanelsHidden: React.Dispatch<React.SetStateAction<boolean>>;
  isFocusMap: boolean;
  setIsFocusMap: React.Dispatch<React.SetStateAction<boolean>>;
  fp: ReturnType<typeof useFloatingPanels>;
  selectedCharacterId: string;
  setSelectedCharacterId: React.Dispatch<React.SetStateAction<string>>;
  inspectedCharacterId: string;
  setInspectedCharacterId: React.Dispatch<React.SetStateAction<string>>;
  showCharacterWizard: boolean;
  setShowCharacterWizard: React.Dispatch<React.SetStateAction<boolean>>;
  showShortcuts: boolean;
  setShowShortcuts: React.Dispatch<React.SetStateAction<boolean>>;
  isBusy: boolean;
}

export const PanelContext = createContext<PanelContextValue | null>(null);

export function usePanelContext(): PanelContextValue {
  const ctx = useContext(PanelContext);
  if (!ctx) throw new Error("usePanelContext must be used within WorkspaceProvider");
  return ctx;
}
