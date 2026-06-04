import { useCallback, useMemo, useState } from "react";
import type { Scene, SceneToken } from "../api/types";
import { apiRequest } from "../api/client";

export interface UseVttStateReturn {
  scenes: Scene[];
  selectedSceneId: string;
  selectedScene: Scene | undefined;
  sceneTokens: SceneToken[];
  loadVttState: (campaignId: string) => Promise<void>;
  loadSceneTokens: (sceneId: string) => Promise<void>;
  setSelectedSceneId: React.Dispatch<React.SetStateAction<string>>;
  setSceneTokens: React.Dispatch<React.SetStateAction<SceneToken[]>>;
  clearVttState: () => void;
}

export function useVttState(token: string): UseVttStateReturn {
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [selectedSceneId, setSelectedSceneId] = useState<string>("");
  const [sceneTokens, setSceneTokens] = useState<SceneToken[]>([]);

  const selectedScene = useMemo(
    () => scenes.find((s) => s.id === selectedSceneId) ?? scenes[0],
    [scenes, selectedSceneId],
  );

  const loadSceneTokens = useCallback(
    async (sceneId: string) => {
      try {
        setSceneTokens(
          await apiRequest<SceneToken[]>(`/api/scenes/${sceneId}/tokens`, token),
        );
      } catch {
        // silently handled by caller
      }
    },
    [token],
  );

  const loadVttState = useCallback(
    async (campaignId: string) => {
      try {
        const data = await apiRequest<Scene[]>(
          `/api/campaigns/${campaignId}/scenes`,
          token,
        );
        setScenes(data);

        if (data.length === 0) {
          setSelectedSceneId("");
          setSceneTokens([]);
          return;
        }

        const effectiveScene =
          data.find((s) => s.id === selectedSceneId) ?? data[0];
        setSelectedSceneId(effectiveScene.id);
        await loadSceneTokens(effectiveScene.id);
      } catch {
        // silently handled by caller
      }
    },
    [token, selectedSceneId, loadSceneTokens],
  );

  const clearVttState = useCallback(() => {
    setScenes([]);
    setSelectedSceneId("");
    setSceneTokens([]);
  }, []);

  return {
    scenes,
    selectedSceneId,
    selectedScene,
    sceneTokens,
    loadVttState,
    loadSceneTokens,
    setSelectedSceneId,
    setSceneTokens,
    clearVttState,
  };
}
