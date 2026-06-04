import { createContext, useContext } from "react";
import type { Character, GameLogEntry, Scene, SceneToken } from "../api/types";
import type { CampaignMapProps } from "../components/CampaignMap";
import type React from "react";

/**
 * VTT-specific state — everything touching the map and tokens.
 * Isolated so panel tabs don't trigger map re-renders.
 */
export interface VttContextValue {
  selectedSceneId: string;
  selectedScene: Scene | undefined;
  sceneTokens: SceneToken[];
  selectedTokenId: string;
  campaignMapProps: CampaignMapProps;
  sceneBackgroundObjectUrl: string;

  setSelectedSceneId: React.Dispatch<React.SetStateAction<string>>;
  setSelectedTokenId: React.Dispatch<React.SetStateAction<string>>;
  setSceneTokens: React.Dispatch<React.SetStateAction<SceneToken[]>>;
  setCharacters: React.Dispatch<React.SetStateAction<Character[]>>;
  setLogEntries: React.Dispatch<React.SetStateAction<GameLogEntry[]>>;

  loadVttState: (campaignId: string) => Promise<void>;
  loadSceneTokens: (sceneId: string) => Promise<void>;
  loadCombatState: (campaignId: string) => Promise<void>;
  loadCharacters: (campaignId: string) => Promise<void>;
  setSelectedCampaignId: (id: string) => void;
}

export const VttContext = createContext<VttContextValue | null>(null);

export function useVttContext(): VttContextValue {
  const ctx = useContext(VttContext);
  if (!ctx) throw new Error("useVttContext must be used within WorkspaceProvider");
  return ctx;
}
