import { createContext, useContext } from "react";
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

/**
 * Read-only workspace state — stable until campaign/scene changes.
 * Panels subscribe to this context for data, not for actions.
 */
export interface WorkspaceState {
  token: string;
  user: User | null;
  campaigns: Campaign[];
  selectedCampaign: Campaign | undefined;
  activeCampaignId: string | undefined;
  members: Member[];
  characters: Character[];
  selectedCharacter: Character | undefined;
  selectedCharacterId: string;
  encounters: Encounter[];
  handouts: Handout[];
  rolls: Roll[];
  logEntries: GameLogEntry[];
  latestInvite: Invite | null;
  activeInvites: Invite[];
  scenes: Scene[];
  selectedScene: Scene | undefined;
  selectedSceneId: string;
  sceneTokens: SceneToken[];
  selectedTokenId: string;
}

export const WorkspaceStateContext = createContext<WorkspaceState | null>(null);

export function useWorkspaceState(): WorkspaceState {
  const ctx = useContext(WorkspaceStateContext);
  if (!ctx) throw new Error("useWorkspaceState must be used within WorkspaceProvider");
  return ctx;
}
