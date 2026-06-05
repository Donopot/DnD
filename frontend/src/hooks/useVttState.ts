import { useCallback, useMemo, useRef, useState } from "react";
import { apiRequest } from "../api/client";
import type { Asset, Combatant, Encounter, EncounterDetail, Scene, SceneToken } from "../api/types";

export interface UseVttStateReturn {
  scenes: Scene[];
  selectedSceneId: string;
  selectedScene: Scene | undefined;
  sceneTokens: SceneToken[];
  encounters: Encounter[];
  selectedEncounterId: string;
  loadVttState: (campaignId: string) => Promise<void>;
  loadSceneTokens: (sceneId: string) => Promise<void>;
  loadCombatState: (campaignId: string) => Promise<void>;
  loadAssets: (campaignId: string) => Promise<void>;
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

export function useVttState(
  token: string,
  opts?: { onError?: (msg: string) => void },
): UseVttStateReturn {
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [selectedSceneId, setSelectedSceneId] = useState<string>("");
  const [sceneTokens, setSceneTokens] = useState<SceneToken[]>([]);
  const [encounters, setEncounters] = useState<Encounter[]>([]);
  const [selectedEncounterId, setSelectedEncounterId] = useState<string>("");
  const [, setCombatants] = useState<Combatant[]>([]);
  const [, setAssetList] = useState<Asset[]>([]);
  const [, setSelectedAssetId] = useState<string>("");
  const vttRequestRef = useRef(0);
  const sceneTokensRequestRef = useRef(0);
  const combatRequestRef = useRef(0);
  const assetsRequestRef = useRef(0);

  const selectedScene = useMemo(
    () => scenes.find((s) => s.id === selectedSceneId) ?? scenes[0],
    [scenes, selectedSceneId],
  );

  const loadSceneTokens = useCallback(
    async (sceneId: string) => {
      const requestId = ++sceneTokensRequestRef.current;
      try {
        const data = await apiRequest<SceneToken[]>(`/api/scenes/${sceneId}/tokens`, token);
        if (requestId !== sceneTokensRequestRef.current) return;
        setSceneTokens(data);
      } catch (error) {
        if (requestId !== sceneTokensRequestRef.current) return;
        opts?.onError?.(error instanceof Error ? error.message : "Unable to load scene tokens");
      }
    },
    [token],
  );

  const loadVttState = useCallback(
    async (campaignId: string) => {
      const requestId = ++vttRequestRef.current;
      try {
        const data = await apiRequest<Scene[]>(`/api/campaigns/${campaignId}/scenes`, token);
        if (requestId !== vttRequestRef.current) return;
        setScenes(data);

        if (data.length === 0) {
          setSelectedSceneId("");
          setSceneTokens([]);
          return;
        }

        const effectiveScene = data.find((s) => s.id === selectedSceneId) ?? data[0];
        setSelectedSceneId(effectiveScene.id);
        await loadSceneTokens(effectiveScene.id);
      } catch (error) {
        if (requestId !== vttRequestRef.current) return;
        opts?.onError?.(error instanceof Error ? error.message : "Unable to load VTT state");
      }
    },
    [token, selectedSceneId, loadSceneTokens],
  );

  // ── Token operations ──────────────────────────────────────

  const performTokenAction = useCallback(
    async (action: string, tokenToAct: SceneToken, value?: number): Promise<SceneToken | void> => {
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
          const updated = await apiRequest<SceneToken>(`/api/tokens/${tokenToAct.id}`, token, {
            method: "PATCH",
            body: JSON.stringify({ is_hidden: action === "hide" }),
          });
          setSceneTokens((current) => current.map((t) => (t.id === updated.id ? updated : t)));
          return updated;
        }
        case "front": {
          const fwd = await apiRequest<SceneToken>(
            `/api/tokens/${tokenToAct.id}/bring-forward`,
            token,
            { method: "POST" },
          );
          setSceneTokens((current) => current.map((t) => (t.id === fwd.id ? fwd : t)));
          return fwd;
        }
        case "back": {
          const bwd = await apiRequest<SceneToken>(
            `/api/tokens/${tokenToAct.id}/send-backward`,
            token,
            { method: "POST" },
          );
          setSceneTokens((current) => current.map((t) => (t.id === bwd.id ? bwd : t)));
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
          const updated = await apiRequest<SceneToken>(`/api/tokens/${tokenToAct.id}`, token, {
            method: "PATCH",
            body: JSON.stringify({
              metadata: { ...tokenToAct.metadata, hp_current: newHp },
            }),
          });
          setSceneTokens((current) => current.map((t) => (t.id === updated.id ? updated : t)));
          return updated;
        }
      }
    },
    [token],
  );

  const handleToggleTokenHidden = useCallback(
    async (tokenToToggle: SceneToken) => {
      const updated = await apiRequest<SceneToken>(`/api/tokens/${tokenToToggle.id}`, token, {
        method: "PATCH",
        body: JSON.stringify({ is_hidden: !tokenToToggle.is_hidden }),
      });
      setSceneTokens((current) => current.map((t) => (t.id === updated.id ? updated : t)));
    },
    [token],
  );

  // ── Combat state ──────────────────────────────────────────

  const updateEncounterFromDetail = useCallback((detail: EncounterDetail) => {
    setEncounters((current) => {
      const summary: Encounter = {
        id: detail.id,
        campaign_id: detail.campaign_id,
        scene_id: detail.scene_id,
        name: detail.name,
        status: detail.status,
        round_number: detail.round_number,
        turn_index: detail.turn_index,
        active_combatant_id: detail.active_combatant_id,
        created_at: detail.created_at,
        updated_at: detail.updated_at,
      };

      if (current.some((item) => item.id === detail.id)) {
        return current.map((item) => (item.id === detail.id ? summary : item));
      }

      return [summary, ...current];
    });

    setCombatants(detail.combatants);
  }, []);

  const loadEncounterDetail = useCallback(
    async (encounterId: string, requestId = combatRequestRef.current) => {
      try {
        const detail = await apiRequest<EncounterDetail>(`/api/encounters/${encounterId}`, token);
        if (requestId !== combatRequestRef.current) return;
        updateEncounterFromDetail(detail);
      } catch (error) {
        if (requestId !== combatRequestRef.current) return;
        opts?.onError?.(error instanceof Error ? error.message : "Unable to load encounter detail");
      }
    },
    [token, updateEncounterFromDetail],
  );

  const loadCombatState = useCallback(
    async (campaignId: string) => {
      const requestId = ++combatRequestRef.current;
      try {
        const data = await apiRequest<Encounter[]>(
          `/api/campaigns/${campaignId}/encounters`,
          token,
        );
        if (requestId !== combatRequestRef.current) return;
        setEncounters(data);

        if (data.length === 0) {
          setSelectedEncounterId("");
          setCombatants([]);
          return;
        }

        const effectiveEncounter = data.find((e) => e.id === selectedEncounterId) ?? data[0];
        setSelectedEncounterId(effectiveEncounter.id);
        if (requestId !== combatRequestRef.current) return;
        await loadEncounterDetail(effectiveEncounter.id, requestId);
      } catch (error) {
        if (requestId !== combatRequestRef.current) return;
        opts?.onError?.(error instanceof Error ? error.message : "Unable to load combat state");
      }
    },
    [token, selectedEncounterId, loadEncounterDetail],
  );

  const loadAssets = useCallback(
    async (campaignId: string) => {
      const requestId = ++assetsRequestRef.current;
      try {
        const data = await apiRequest<Asset[]>(`/api/campaigns/${campaignId}/assets`, token);
        if (requestId !== assetsRequestRef.current) return;
        setAssetList(data);
        setSelectedAssetId((current) => current || data[0]?.id || "");
      } catch (error) {
        if (requestId !== assetsRequestRef.current) return;
        opts?.onError?.(error instanceof Error ? error.message : "Unable to load assets");
      }
    },
    [token],
  );

  const clearVttState = useCallback(() => {
    vttRequestRef.current += 1;
    sceneTokensRequestRef.current += 1;
    combatRequestRef.current += 1;
    assetsRequestRef.current += 1;
    setScenes([]);
    setSelectedSceneId("");
    setSceneTokens([]);
    setEncounters([]);
    setSelectedEncounterId("");
    setCombatants([]);
  }, []);

  return {
    scenes,
    selectedSceneId,
    selectedScene,
    sceneTokens,
    encounters,
    selectedEncounterId,
    loadVttState,
    loadSceneTokens,
    loadCombatState,
    loadAssets,
    setSelectedSceneId,
    setSceneTokens,
    clearVttState,
    handleToggleTokenHidden,
    performTokenAction,
  };
}
