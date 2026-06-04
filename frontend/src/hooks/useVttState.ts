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
  handleToggleTokenHidden: (tokenToToggle: SceneToken) => Promise<void>;
  performTokenAction: (
    action: string,
    tokenToAct: SceneToken,
    value?: number,
  ) => Promise<SceneToken | void>;
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

  // ── Token operations ──────────────────────────────────────

  const performTokenAction = useCallback(
    async (
      action: string,
      tokenToAct: SceneToken,
      value?: number,
    ): Promise<SceneToken | void> => {
      switch (action) {
        case "duplicate": {
          const dup = await apiRequest<SceneToken>(
            `/api/tokens/${tokenToAct.id}/duplicate`,
            token,
            { method: "POST" },
          );
          setSceneTokens((current) => [...current, dup]);
          return dup;
        }
        case "delete": {
          await apiRequest(`/api/tokens/${tokenToAct.id}`, token, {
            method: "DELETE",
          });
          setSceneTokens((current) => current.filter((t) => t.id !== tokenToAct.id));
          break;
        }
        case "hide":
        case "reveal": {
          const updated = await apiRequest<SceneToken>(
            `/api/tokens/${tokenToAct.id}`,
            token,
            {
              method: "PATCH",
              body: JSON.stringify({ is_hidden: action === "hide" }),
            },
          );
          setSceneTokens((current) =>
            current.map((t) => (t.id === updated.id ? updated : t)),
          );
          return updated;
        }
        case "front": {
          const fwd = await apiRequest<SceneToken>(
            `/api/tokens/${tokenToAct.id}/bring-forward`,
            token,
            { method: "POST" },
          );
          setSceneTokens((current) =>
            current.map((t) => (t.id === fwd.id ? fwd : t)),
          );
          return fwd;
        }
        case "back": {
          const bwd = await apiRequest<SceneToken>(
            `/api/tokens/${tokenToAct.id}/send-backward`,
            token,
            { method: "POST" },
          );
          setSceneTokens((current) =>
            current.map((t) => (t.id === bwd.id ? bwd : t)),
          );
          return bwd;
        }
        case "damage":
        case "heal": {
          const amount = value ?? 0;
          const hpCurrent = (tokenToAct.metadata?.hp_current as number) ?? 0;
          const hpMax = (tokenToAct.metadata?.hp_max as number) ?? 0;
          const newHp =
            action === "damage"
              ? Math.max(0, hpCurrent - amount)
              : Math.min(hpMax, hpCurrent + amount);
          const updated = await apiRequest<SceneToken>(
            `/api/tokens/${tokenToAct.id}`,
            token,
            {
              method: "PATCH",
              body: JSON.stringify({
                metadata: { ...tokenToAct.metadata, hp_current: newHp },
              }),
            },
          );
          setSceneTokens((current) =>
            current.map((t) => (t.id === updated.id ? updated : t)),
          );
          return updated;
        }
      }
    },
    [token],
  );

  const handleToggleTokenHidden = useCallback(
    async (tokenToToggle: SceneToken) => {
      const updated = await apiRequest<SceneToken>(
        `/api/tokens/${tokenToToggle.id}`,
        token,
        {
          method: "PATCH",
          body: JSON.stringify({ is_hidden: !tokenToToggle.is_hidden }),
        },
      );
      setSceneTokens((current) =>
        current.map((t) => (t.id === updated.id ? updated : t)),
      );
    },
    [token],
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
    handleToggleTokenHidden,
    performTokenAction,
  };
}
