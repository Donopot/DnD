import type { FormEvent } from "react";

import type {
  Asset,
  Character,
  Combatant,
  Encounter,
  GameLogEntry,
  Roll,
  Scene,
  SceneToken,
} from "../api/types";
import { CombatPanel } from "./CombatPanel";
import { SessionLogPanel } from "./SessionLogPanel";
import { VttBoard } from "./VttBoard";

type SessionWorkspaceProps = {
  scenes: Scene[];
  selectedScene: Scene | undefined;
  selectedSceneId: string;
  sceneTokens: SceneToken[];
  characters: Character[];
  selectedCharacter: Character | undefined;
  assets: Asset[];
  selectedAssetId: string;
  sceneBackgroundObjectUrl: string;
  encounters: Encounter[];
  selectedEncounter: Encounter | undefined;
  combatants: Combatant[];
  rolls: Roll[];
  logEntries: GameLogEntry[];
  isBusy: boolean;
  onSelectScene: (sceneId: string) => void;
  onLoadSceneTokens: (sceneId: string) => void;
  onCreateScene: (event: FormEvent<HTMLFormElement>) => void;
  onUploadAsset: (event: FormEvent<HTMLFormElement>) => void;
  onSelectAsset: (assetId: string) => void;
  onSetSceneBackground: () => void;
  onCreateToken: (event: FormEvent<HTMLFormElement>) => void;
  onMoveToken: (token: SceneToken, dx: number, dy: number) => void;
  onCreateEncounter: (event: FormEvent<HTMLFormElement>) => void;
  onSelectEncounter: (encounterId: string) => void;
  onLoadEncounterDetail: (encounterId: string) => void;
  onStartEncounter: () => void;
  onNextTurn: () => void;
  onEndEncounter: () => void;
  onAddCombatant: (event: FormEvent<HTMLFormElement>) => void;
  onAdjustCombatantHp: (combatant: Combatant, delta: number) => void;
  onToggleDefeated: (combatant: Combatant) => void;
  onRoll: (event: FormEvent<HTMLFormElement>) => void;
  onAddNote: (event: FormEvent<HTMLFormElement>) => void;
};

export function SessionWorkspace({
  scenes,
  selectedScene,
  selectedSceneId,
  sceneTokens,
  characters,
  selectedCharacter,
  assets,
  selectedAssetId,
  sceneBackgroundObjectUrl,
  encounters,
  selectedEncounter,
  combatants,
  rolls,
  logEntries,
  isBusy,
  onSelectScene,
  onLoadSceneTokens,
  onCreateScene,
  onUploadAsset,
  onSelectAsset,
  onSetSceneBackground,
  onCreateToken,
  onMoveToken,
  onCreateEncounter,
  onSelectEncounter,
  onLoadEncounterDetail,
  onStartEncounter,
  onNextTurn,
  onEndEncounter,
  onAddCombatant,
  onAdjustCombatantHp,
  onToggleDefeated,
  onRoll,
  onAddNote,
}: SessionWorkspaceProps) {
  return (
    <div className="session-workspace">
      <section className="session-map-zone">
        <VttBoard
          scenes={scenes}
          selectedScene={selectedScene}
          selectedSceneId={selectedSceneId}
          sceneTokens={sceneTokens}
          characters={characters}
          selectedCharacter={selectedCharacter}
          assets={assets}
          selectedAssetId={selectedAssetId}
          sceneBackgroundObjectUrl={sceneBackgroundObjectUrl}
          isBusy={isBusy}
          onSelectScene={onSelectScene}
          onLoadSceneTokens={onLoadSceneTokens}
          onCreateScene={onCreateScene}
          onUploadAsset={onUploadAsset}
          onSelectAsset={onSelectAsset}
          onSetSceneBackground={onSetSceneBackground}
          onCreateToken={onCreateToken}
          onMoveToken={onMoveToken}
        />
      </section>

      <aside className="session-side-zone">
        <CombatPanel
          encounters={encounters}
          selectedEncounter={selectedEncounter}
          combatants={combatants}
          characters={characters}
          selectedCharacter={selectedCharacter}
          sceneTokens={sceneTokens}
          isBusy={isBusy}
          onCreateEncounter={onCreateEncounter}
          onSelectEncounter={onSelectEncounter}
          onLoadEncounterDetail={onLoadEncounterDetail}
          onStartEncounter={onStartEncounter}
          onNextTurn={onNextTurn}
          onEndEncounter={onEndEncounter}
          onAddCombatant={onAddCombatant}
          onAdjustCombatantHp={onAdjustCombatantHp}
          onToggleDefeated={onToggleDefeated}
        />

        <SessionLogPanel
          characters={characters}
          selectedCharacter={selectedCharacter}
          rolls={rolls}
          logEntries={logEntries}
          isBusy={isBusy}
          onRoll={onRoll}
          onAddNote={onAddNote}
        />
      </aside>
    </div>
  );
}
