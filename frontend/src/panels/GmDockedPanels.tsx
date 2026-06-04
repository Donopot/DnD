import {
  type Dispatch,
  type FormEvent,
  type RefObject,
  type SetStateAction,
  useRef,
} from "react";
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
import {
  getDockedPanelsForView,
  renderDockedPanel,
} from "./panelRenderer";

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
  wsRef: RefObject<WebSocket | null>;
  user: User | null;
  isBusy: boolean;
  latestInvite: Invite | null;
  activeInvites: Invite[];

  handleQuickRoll: (
    formula: string,
    label: string,
    mode: "normal" | "advantage" | "disadvantage",
  ) => void;
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

  setSelectedTokenId: Dispatch<SetStateAction<string>>;
  setSceneTokens: Dispatch<SetStateAction<SceneToken[]>>;
  setSelectedSceneId: Dispatch<SetStateAction<string>>;
  setSelectedCharacterId: Dispatch<SetStateAction<string>>;
  setInspectedCharacterId: Dispatch<SetStateAction<string>>;
  setShowCharacterWizard: Dispatch<SetStateAction<boolean>>;
  setCharacters: Dispatch<SetStateAction<Character[]>>;
  setLogEntries: Dispatch<SetStateAction<GameLogEntry[]>>;

  loadCombatState: (campaignId: string) => Promise<void>;
  loadSceneTokens: (sceneId: string) => Promise<void>;
  loadVttState: (campaignId: string) => Promise<void>;
};

export function GmDockedPanels(props: GmDockedPanelsProps) {
  const logRefreshAbortRef = useRef<AbortController | null>(null);
  const panels = getDockedPanelsForView(props.gmView, props.liveModePanelIds);

  return (
    <>
      {panels.map((panel) =>
        renderDockedPanel(panel, {
          ...props,
          logRefreshAbortRef,
          setSelectedTokenId: (id) => props.setSelectedTokenId(id),
          setSelectedSceneId: (id) => props.setSelectedSceneId(id),
          setSelectedCharacterId: (id) => props.setSelectedCharacterId(id),
          setInspectedCharacterId: (id) => props.setInspectedCharacterId(id),
        }),
      )}
    </>
  );
}
