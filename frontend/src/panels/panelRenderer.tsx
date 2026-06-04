import { ExternalLink, Plus, UserPlus } from "lucide-react";
import {
  type Dispatch,
  type FormEvent,
  lazy,
  type MutableRefObject,
  type ReactNode,
  type RefObject,
  type SetStateAction,
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
import { GM_PANELS, type GmPanelDefinition } from "../config/gmPanels";
import type { CampaignMapProps } from "../components/CampaignMap";

const ActiveEncounterPanel = lazy(() =>
  import("../components/ActiveEncounterPanel").then((m) => ({ default: m.ActiveEncounterPanel })),
);
const AmbiancePanel = lazy(() =>
  import("../components/AmbiancePanel").then((m) => ({ default: m.AmbiancePanel })),
);
const BestiaryPanel = lazy(() =>
  import("../components/BestiaryPanel").then((m) => ({ default: m.BestiaryPanel })),
);
const CampaignMap = lazy(() =>
  import("../components/CampaignMap").then((m) => ({ default: m.CampaignMap })),
);
const ChatPanel = lazy(() =>
  import("../components/ChatPanel").then((m) => ({ default: m.default })),
);
const CombatTracker = lazy(() =>
  import("../components/CombatTracker").then((m) => ({ default: m.CombatTracker })),
);
const ConditionsPanel = lazy(() =>
  import("../components/ConditionsPanel").then((m) => ({ default: m.ConditionsPanel })),
);
const DiceRoller = lazy(() =>
  import("../components/DiceRoller").then((m) => ({ default: m.DiceRoller })),
);
const DungeonGenerator = lazy(() =>
  import("../components/DungeonGenerator").then((m) => ({ default: m.DungeonGenerator })),
);
const EditCharacterSheet = lazy(() =>
  import("../components/EditCharacterSheet").then((m) => ({ default: m.EditCharacterSheet })),
);
const EncounterBuilder = lazy(() =>
  import("../components/EncounterBuilder").then((m) => ({ default: m.EncounterBuilder })),
);
const GmMessagePanel = lazy(() =>
  import("../components/GmMessagePanel").then((m) => ({ default: m.GmMessagePanel })),
);
const GmNotesPanel = lazy(() =>
  import("../components/GmNotesPanel").then((m) => ({ default: m.GmNotesPanel })),
);
const HandoutPanel = lazy(() =>
  import("../components/HandoutPanel").then((m) => ({ default: m.HandoutPanel })),
);
const HomebrewPanel = lazy(() =>
  import("../components/HomebrewPanel").then((m) => ({ default: m.HomebrewPanel })),
);
const InitiativePanel = lazy(() =>
  import("../components/InitiativePanel").then((m) => ({ default: m.InitiativePanel })),
);
const ItemCompendium = lazy(() =>
  import("../components/ItemCompendium").then((m) => ({ default: m.ItemCompendium })),
);
const NpcGenerator = lazy(() =>
  import("../components/NpcGenerator").then((m) => ({ default: m.default })),
);
const PartySummaryPanel = lazy(() =>
  import("../components/PartySummaryPanel").then((m) => ({ default: m.PartySummaryPanel })),
);
const QuickActions = lazy(() =>
  import("../components/QuickActions").then((m) => ({ default: m.QuickActions })),
);
const RulesReference = lazy(() =>
  import("../components/RulesReference").then((m) => ({ default: m.RulesReference })),
);
const ScenePanel = lazy(() =>
  import("../components/ScenePanel").then((m) => ({ default: m.ScenePanel })),
);
const SessionLogPanel = lazy(() =>
  import("../components/SessionLogPanel").then((m) => ({ default: m.SessionLogPanel })),
);
const SessionStats = lazy(() =>
  import("../components/SessionStats").then((m) => ({ default: m.SessionStats })),
);
const SpellbookPanel = lazy(() =>
  import("../components/SpellbookPanel").then((m) => ({ default: m.SpellbookPanel })),
);
const TokenDetailPanel = lazy(() =>
  import("../components/TokenDetailPanel").then((m) => ({ default: m.TokenDetailPanel })),
);
const TokenLibraryPanel = lazy(() =>
  import("../components/TokenLibraryPanel").then((m) => ({ default: m.TokenLibraryPanel })),
);
const TokenPanel = lazy(() =>
  import("../components/TokenPanel").then((m) => ({ default: m.TokenPanel })),
);
const VisibilityInspectorPanel = lazy(() =>
  import("../components/VisibilityInspectorPanel").then((m) => ({
    default: m.VisibilityInspectorPanel,
  })),
);

export const MAP_PANEL_ID = "campaign-map";

export const PanelFallback = () => (
  <div className="panel-loading">
    <div className="skeleton skeleton-title" />
    <div className="skeleton skeleton-text" />
    <div className="skeleton skeleton-text short" />
    <div className="skeleton skeleton-text" />
  </div>
);

export type GmPanelRenderProps = {
  fpOpen?: (id: string, title: string) => void;
  selectedCampaign: Campaign | undefined;
  token: string;
  scenes: Scene[];
  encounters: Encounter[];
  sceneTokens: SceneToken[];
  selectedScene: Scene | undefined;
  selectedSceneId: string;
  selectedTokenId: string;
  characters: Character[];
  selectedCharacter: Character | undefined;
  handouts: Handout[];
  rolls: Roll[];
  logEntries: GameLogEntry[];
  members: Member[];
  wsRef: RefObject<WebSocket | null>;
  user: User | null;
  isBusy: boolean;
  latestInvite?: Invite | null;
  activeInvites?: Invite[];
  campaignMapProps?: CampaignMapProps;
  logRefreshAbortRef?: MutableRefObject<AbortController | null>;
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
  handleCreateCharacter?: (e: FormEvent<HTMLFormElement>) => void;
  handleCreateInvite?: () => void;
  handleRevokeInvite?: (token: string) => void;
  setSelectedTokenId: (id: string) => void;
  setSceneTokens: Dispatch<SetStateAction<SceneToken[]>>;
  setSelectedSceneId: (id: string) => void;
  setSelectedCharacterId?: (id: string) => void;
  setInspectedCharacterId?: (id: string) => void;
  setShowCharacterWizard?: Dispatch<SetStateAction<boolean>>;
  setCharacters?: Dispatch<SetStateAction<Character[]>>;
  setLogEntries?: Dispatch<SetStateAction<GameLogEntry[]>>;
  loadCombatState: (campaignId: string) => Promise<void>;
  loadSceneTokens: (sceneId: string) => Promise<void>;
  loadVttState: (campaignId: string) => Promise<void>;
};

export function getPanelTitle(panelId: string): string {
  const panel = GM_PANELS.find((item) => item.id === panelId);
  return panel ? `${panel.emoji} ${panel.label}` : panelId;
}

export function getDockedPanelsForView(category: string, visiblePanelIds: Set<string>) {
  if (category === "settings") {
    return GM_PANELS.filter((panel) => panel.id === "settings-placeholder");
  }

  return GM_PANELS.filter(
    (panel) =>
      panel.status === "active" &&
      panel.category === category &&
      visiblePanelIds.has(panel.id),
  );
}

function selectedToken(props: GmPanelRenderProps) {
  return props.sceneTokens.find((token) => token.id === props.selectedTokenId);
}

function selectedTokenCharacter(props: GmPanelRenderProps) {
  const token = selectedToken(props);
  return props.characters.find((character) => character.id === token?.character_id);
}

function selectedTokenPosition(props: GmPanelRenderProps) {
  const token = selectedToken(props);
  return token ? { x: token.x, y: token.y } : undefined;
}

function refreshSessionLog(props: GmPanelRenderProps, category?: string) {
  if (!props.selectedCampaign || !props.setLogEntries) return;

  void (async () => {
    try {
      props.logRefreshAbortRef?.current?.abort();
      const controller = new AbortController();
      if (props.logRefreshAbortRef) {
        props.logRefreshAbortRef.current = controller;
      }

      const suffix = category ? `&category=${encodeURIComponent(category)}` : "";
      const response = await fetch(
        `/api/campaigns/${props.selectedCampaign.id}/log?limit=100${suffix}`,
        {
          headers: { Authorization: `Bearer ${props.token}` },
          signal: controller.signal,
        },
      );
      if (response.ok) {
        props.setLogEntries(await response.json());
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
    }
  })();
}

function renderCampaignInfo(props: GmPanelRenderProps) {
  const activeInvites = props.activeInvites ?? [];
  if (!props.selectedCampaign) return null;

  return (
    <div className="campaign-overview">
      <p className="muted">{props.selectedCampaign.description || "Aucune description."}</p>
      {props.handleCreateInvite && (
        <div className="action-row">
          <button
            className="primary-button compact"
            disabled={props.isBusy}
            onClick={props.handleCreateInvite}
            type="button"
          >
            <UserPlus aria-hidden="true" size={14} /> Inviter un joueur
          </button>
        </div>
      )}
      {props.latestInvite && (
        <div className="invite-link-box">
          <p className="invite-link-label">Lien d'invitation :</p>
          <div className="invite-link-row">
            <input
              className="invite-link-input"
              readOnly
              value={`${window.location.origin}/invite/${props.latestInvite.token}`}
              onClick={(event) => (event.target as HTMLInputElement).select()}
            />
            <button
              className="compact"
              onClick={() => {
                void navigator.clipboard.writeText(
                  `${window.location.origin}/invite/${props.latestInvite?.token}`,
                );
              }}
              type="button"
            >
              Copier
            </button>
          </div>
        </div>
      )}
      {activeInvites.length > 0 && props.handleRevokeInvite && (
        <div className="active-invites-list">
          <h4>Invitations actives ({activeInvites.length})</h4>
          {activeInvites.map((invite) => (
            <div className="active-invite-row" key={invite.token}>
              <span className="invite-token-preview">/invite/{invite.token.slice(0, 10)}...</span>
              <span className="invite-uses">
                {invite.use_count}/{invite.max_uses ?? "infini"}
              </span>
              <button
                className="danger-button compact"
                disabled={props.isBusy}
                onClick={() => props.handleRevokeInvite?.(invite.token)}
                type="button"
                title="Revoquer cette invitation"
              >
                x
              </button>
            </div>
          ))}
        </div>
      )}
      <h4>Membres ({props.members.length})</h4>
      <div className="member-list">
        {props.members.map((member) => (
          <div className="member-row" key={member.user_id}>
            <span>{member.display_name}</span>
            <small>{member.role}</small>
          </div>
        ))}
      </div>
    </div>
  );
}

function renderCharacters(props: GmPanelRenderProps) {
  return (
    <div className="character-section">
      {props.setShowCharacterWizard && (
        <button
          className="primary-button compact"
          onClick={() => props.setShowCharacterWizard?.(true)}
          style={{ width: "100%", marginBottom: "0.5rem" }}
          type="button"
        >
          Creation assistee
        </button>
      )}

      {props.handleCreateCharacter && (
        <form className="character-form" onSubmit={props.handleCreateCharacter}>
          <label>
            <input
              name="name"
              minLength={2}
              maxLength={120}
              required
              placeholder="Nom du personnage"
            />
          </label>
          <div className="mini-grid">
            <label>
              <input name="ancestry" maxLength={80} placeholder="Origine" />
            </label>
            <label>
              <input name="class_name" maxLength={80} placeholder="Classe" />
            </label>
          </div>
          <div className="mini-grid">
            <label>
              <input name="level" type="number" min={1} max={20} defaultValue={1} />
            </label>
            <label>
              <input name="hp_max" type="number" min={1} defaultValue={10} />
            </label>
            <label>
              <input name="armor_class" type="number" min={1} max={40} defaultValue={10} />
            </label>
            <label>
              <input name="speed" type="number" min={0} max={200} defaultValue={30} />
            </label>
          </div>
          <button className="primary-button compact" disabled={props.isBusy} type="submit">
            <Plus aria-hidden="true" size={12} /> Ajouter
          </button>
        </form>
      )}

      <div className="character-list">
        {props.characters.map((character) => (
          <div
            className={`character-row ${
              props.selectedCharacter?.id === character.id ? "selected" : ""
            }`}
            key={character.id}
          >
            <button
              className="character-row-btn"
              onClick={() => props.setSelectedCharacterId?.(character.id)}
              type="button"
            >
              <span>
                <strong>{character.name}</strong>
                <small>
                  Niv.{character.level} {character.class_name}
                </small>
              </span>
              <em>
                {character.hp_current}/{character.hp_max} PV
              </em>
            </button>
            <button
              className="character-inspect-btn"
              onClick={() => props.setInspectedCharacterId?.(character.id)}
              title="Gerer le personnage"
              type="button"
            >
              Inspecter
            </button>
          </div>
        ))}
      </div>

      {props.selectedCharacter && props.setCharacters && (
        <EditCharacterSheet
          character={props.selectedCharacter}
          token={props.token}
          isBusy={props.isBusy}
          onSave={(updated) =>
            props.setCharacters?.((characters) =>
              characters.map((character) =>
                character.id === updated.id ? updated : character,
              ),
            )
          }
        />
      )}
    </div>
  );
}

export function renderGmPanelContent(panelId: string, props: GmPanelRenderProps): ReactNode {
  const campaignId = props.selectedCampaign?.id ?? "";
  const sceneId = props.selectedScene?.id ?? "";

  switch (panelId) {
    case "active-encounter":
      return <ActiveEncounterPanel campaignId={campaignId} token={props.token} />;
    case "ambiance":
      return <AmbiancePanel isGM={true} />;
    case "bestiary":
      return <BestiaryPanel token={props.token} />;
    case "campaign-info":
      return renderCampaignInfo(props);
    case "characters":
      return renderCharacters(props);
    case "chat":
      return (
        <ChatPanel
          campaignId={campaignId}
          wsRef={props.wsRef}
          userId={props.user?.id}
          displayName={props.user?.display_name}
        />
      );
    case "combat":
      return (
        <CombatTracker
          campaignId={campaignId}
          token={props.token}
          onEncounterChange={() => void props.loadCombatState(campaignId)}
        />
      );
    case "conditions":
      return <ConditionsPanel campaignId={campaignId} token={props.token} />;
    case "dice-roller":
      return (
        <DiceRoller
          onRoll={(formula, label, mode) => void props.handleQuickRoll(formula, label, mode)}
        />
      );
    case "dungeon-generator":
      return <DungeonGenerator token={props.token} />;
    case "encounter-builder":
      return <EncounterBuilder campaignId={campaignId} token={props.token} />;
    case "gm-messages":
      return <GmMessagePanel campaignId={campaignId} token={props.token} members={props.members} />;
    case "gm-notes":
      return (
        <GmNotesPanel
          campaignId={campaignId}
          selectedScene={props.selectedScene}
          selectedToken={selectedToken(props)}
        />
      );
    case "handouts":
      return (
        <HandoutPanel
          handouts={props.handouts}
          scenes={props.scenes}
          isBusy={props.isBusy}
          campaignId={campaignId}
          onCreateHandout={props.handleCreateHandout}
          onRevealHandout={(handout) => void props.handleRevealHandout(handout)}
          onDeleteHandout={(handout) => void props.handleDeleteHandout(handout)}
        />
      );
    case "homebrew":
      return (
        <HomebrewPanel
          campaignId={campaignId}
          token={props.token}
          scenes={props.scenes}
          encounters={props.encounters}
          isBusy={props.isBusy}
        />
      );
    case "initiative":
      return <InitiativePanel campaignId={campaignId} token={props.token} />;
    case "items":
      return <ItemCompendium token={props.token} />;
    case "npc-generator":
      return <NpcGenerator />;
    case "party-summary":
      return (
        <PartySummaryPanel
          characters={props.characters}
          selectedCharacter={props.selectedCharacter}
        />
      );
    case "quick-actions":
      return (
        <QuickActions
          onRoll={(formula, label, mode) => void props.handleQuickRoll(formula, label, mode)}
        />
      );
    case "rules":
      return <RulesReference />;
    case "scene":
      return (
        <ScenePanel
          campaignId={campaignId}
          token={props.token}
          scenes={props.scenes}
          onSelectScene={(id) => props.setSelectedSceneId(id)}
          onScenesChanged={() => {
            if (campaignId) void props.loadVttState(campaignId);
          }}
        />
      );
    case "session-log":
      return (
        <SessionLogPanel
          characters={props.characters}
          selectedCharacter={props.selectedCharacter}
          rolls={props.rolls}
          logEntries={props.logEntries}
          isBusy={props.isBusy}
          token={props.token}
          onRoll={props.handleRoll}
          onAddNote={props.handleLogNote}
          onRefresh={(category) => refreshSessionLog(props, category)}
        />
      );
    case "session-stats":
      return <SessionStats campaignId={campaignId} token={props.token} />;
    case "settings-placeholder":
      return (
        <div className="empty-state compact-empty">
          <p>Parametres a venir : permissions, layout, theme.</p>
        </div>
      );
    case "spellbook":
      return <SpellbookPanel token={props.token} />;
    case "token-detail":
      return (
        <TokenDetailPanel
          selectedScene={props.selectedScene}
          selectedToken={selectedToken(props)}
          selectedTokenCharacter={selectedTokenCharacter(props)}
          selectedTokenPosition={selectedTokenPosition(props)}
          token={props.token}
          onDeselectToken={() => props.setSelectedTokenId("")}
          onNudgeSelectedToken={(dx, dy) => {
            const token = selectedToken(props);
            if (token) void props.handleMoveToken(token, dx, dy);
          }}
          onTokenUpdated={(updated) => {
            props.setSceneTokens((current) => {
              if (!updated) return current;
              return current.some((token) => token.id === updated.id)
                ? current.map((token) => (token.id === updated.id ? updated : token))
                : [...current, updated];
            });
          }}
        />
      );
    case "token-library":
      return (
        <TokenLibraryPanel
          campaignId={campaignId}
          token={props.token}
          selectedSceneId={props.selectedScene?.id}
          onTokensChanged={() => {
            if (sceneId) void props.loadSceneTokens(sceneId);
          }}
        />
      );
    case "tokens":
      return (
        <TokenPanel
          campaignId={campaignId}
          token={props.token}
          sceneId={sceneId}
          tokens={props.sceneTokens}
          onTokensChanged={() => {
            if (sceneId) void props.loadSceneTokens(sceneId);
          }}
        />
      );
    case "visibility-inspector":
      return (
        <VisibilityInspectorPanel
          selectedScene={props.selectedScene}
          selectedToken={selectedToken(props)}
          sceneTokens={props.sceneTokens}
          isGM={true}
          onToggleTokenHidden={props.handleToggleTokenHidden}
          onOpenPanel={(id) => props.fpOpen?.(id, getPanelTitle(id))}
        />
      );
    case MAP_PANEL_ID:
      return props.campaignMapProps ? (
        <div className="floating-map-panel">
          <CampaignMap {...props.campaignMapProps} />
        </div>
      ) : null;
    default:
      return null;
  }
}

function isPanelOpenByDefault(panelId: string) {
  return (
    panelId === "combat" ||
    panelId === "active-encounter" ||
    panelId === "campaign-info" ||
    panelId === "characters"
  );
}

export function renderDockedPanel(
  panel: GmPanelDefinition,
  props: GmPanelRenderProps,
): ReactNode {
  const content = renderGmPanelContent(panel.id, props);
  if (!content) return null;

  const title = getPanelTitle(panel.id);

  if (!panel.detachable) {
    return (
      <details className="gm-panel-section" key={panel.id} open={isPanelOpenByDefault(panel.id)}>
        <summary>{title}</summary>
        {content}
      </details>
    );
  }

  return (
    <details className="gm-panel-section" key={panel.id} open={isPanelOpenByDefault(panel.id)}>
      <summary>
        {title}
        <button
          className="panel-detach-btn"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            props.fpOpen?.(panel.id, title);
          }}
          title="Detacher en panneau flottant"
          type="button"
        >
          <ExternalLink size={12} />
        </button>
      </summary>
      {content}
    </details>
  );
}
