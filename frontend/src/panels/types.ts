import type { ComponentProps, ReactNode } from "react";
import type {
  Campaign,
  Character,
  Encounter,
  GameLogEntry,
  Handout,
  Member,
  Roll,
  Scene,
  SceneToken,
  User,
} from "../api/types";
import type { CampaignMap } from "../components/CampaignMap";
import type { FloatingPanelState } from "../hooks/useFloatingPanels";

// ── Shared context for panel rendering ────────────────────────────────

export type PanelRenderContext = {
  campaignId: string;
  token: string;
  campaigns: Campaign[];
  selectedCampaign: Campaign | undefined;
  selectedSceneId: string;
  selectedScene: Scene | undefined;
  sceneTokens: SceneToken[];
  characters: Character[];
  handouts: Handout[];
  rolls: Roll[];
  logEntries: GameLogEntry[];
  selectedTokenId: string;
  selectedCharacterId: string;

  fp: {
    panels: FloatingPanelState[];
    open: (id: string, title: string) => void;
    close: (id: string) => void;
    minimize: (id: string) => void;
    bringToFront: (id: string) => void;
    updatePosition: (id: string, x: number, y: number) => void;
    updateSize: (id: string, w: number, h: number) => void;
  };

  onRoll: (formula: string, label: string, mode: "normal" | "advantage" | "disadvantage") => void;
};

export type PanelComponent = (ctx: PanelRenderContext) => ReactNode;

// ── Props for GmFloatingPanels component ──────────────────────────────

export type GmFloatingPanelsProps = {
  fp: PanelRenderContext["fp"];
  selectedCampaign: Campaign | undefined;
  token: string;
  scenes: Scene[];
  encounters: Encounter[];
  characters: Character[];
  selectedCharacter: Character | undefined;
  handouts: Handout[];
  rolls: Roll[];
  logEntries: GameLogEntry[];
  members: Member[];
  wsRef: React.RefObject<WebSocket | null>;
  user: User | null;
  isBusy: boolean;
  selectedSceneId: string;
  selectedTokenId: string;
  selectedScene: Scene | undefined;
  sceneTokens: SceneToken[];
  campaignMapProps: ComponentProps<typeof CampaignMap>;
  handleQuickRoll: (formula: string, label: string, mode: "normal" | "advantage" | "disadvantage") => void;
  handleRoll: (e: React.FormEvent<HTMLFormElement>) => void;
  handleLogNote: (e: React.FormEvent<HTMLFormElement>) => void;
  handleCreateHandout: (e: React.FormEvent<HTMLFormElement>) => void;
  handleRevealHandout: (handout: Handout) => Promise<void>;
  handleDeleteHandout: (handout: Handout) => Promise<void>;
  handleToggleTokenHidden: (token: SceneToken) => Promise<void>;
  handleMoveToken: (token: SceneToken, dx: number, dy: number) => Promise<void>;
  loadCombatState: (campaignId: string) => Promise<void>;
  loadSceneTokens: (sceneId: string) => Promise<void>;
  loadVttState: (campaignId: string) => Promise<void>;
  setSelectedTokenId: (id: string) => void;
  setSceneTokens: React.Dispatch<React.SetStateAction<SceneToken[]>>;
  setSelectedSceneId: (id: string) => void;
};