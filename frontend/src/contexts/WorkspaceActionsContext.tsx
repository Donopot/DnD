import type { FormEvent } from "react";
import { createContext, useContext } from "react";
import type { Handout, SceneToken } from "../api/types";

/**
 * Stable callbacks — references stabilized via useCallback/useRef at Provider level.
 * Panels subscribe here for actions (create/delete/reveal/move/roll, etc.)
 * without causing re-renders when state changes.
 */
export interface WorkspaceActions {
  // Handouts
  handleCreateHandout: (e: FormEvent<HTMLFormElement>) => void;
  handleRevealHandout: (handout: Handout) => Promise<void>;
  handleDeleteHandout: (handout: Handout) => Promise<void>;

  // Dice & Journal
  handleRoll: (e: FormEvent<HTMLFormElement>) => void;
  handleQuickRoll: (
    formula: string,
    label: string,
    mode: "normal" | "advantage" | "disadvantage",
  ) => void;
  handleLogNote: (e: FormEvent<HTMLFormElement>) => void;

  // Tokens
  handleToggleTokenHidden: (token: SceneToken) => Promise<void>;
  handleMoveToken: (token: SceneToken, dx: number, dy: number) => Promise<void>;

  // Characters
  handleCreateCharacter: (e: FormEvent<HTMLFormElement>) => void;

  // Invites
  handleCreateInvite: () => void;
  handleRevokeInvite: (token: string) => void;

  // Auth
  onLogout: () => void;

  // Campaign
  selectCampaign: (id: string) => void;
  loadCampaigns: () => Promise<void>;

  // Data loading
  loadCharacters: (campaignId: string) => Promise<void>;
}

export const WorkspaceActionsContext = createContext<WorkspaceActions | null>(null);

export function useWorkspaceActions(): WorkspaceActions {
  const ctx = useContext(WorkspaceActionsContext);
  if (!ctx) throw new Error("useWorkspaceActions must be used within WorkspaceProvider");
  return ctx;
}
