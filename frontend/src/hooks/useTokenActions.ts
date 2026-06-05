import { useCallback, useRef } from "react";
import { apiRequest } from "../api/client";
import type { Scene, SceneToken } from "../api/types";

export interface UseTokenActionsOptions {
  token: string;
  selectedScene: Scene | undefined;
  setSceneTokens: React.Dispatch<React.SetStateAction<SceneToken[]>>;
  performTokenAction: (
    action: string,
    token: SceneToken,
    value?: number,
  ) => Promise<SceneToken | void>;
  onError: (msg: string) => void;
  onMessage?: (msg: string) => void;
  onStart: () => void;
  onEnd: () => void;
}

export interface UseTokenActionsReturn {
  moveToken: (tokenToMove: SceneToken, dx: number, dy: number) => Promise<void>;
  wrapSingle: (action: string, token: SceneToken, value?: number) => Promise<void>;
  wrapBatch: (action: string, tokens: SceneToken[], value?: number) => Promise<void>;
}

export function useTokenActions(opts: UseTokenActionsOptions): UseTokenActionsReturn {
  const {
    token,
    selectedScene,
    setSceneTokens,
    performTokenAction,
    onError,
    onMessage,
    onStart,
    onEnd,
  } = opts;
  const fogRevealAbortRef = useRef<AbortController | null>(null);

  const moveToken = useCallback(
    async (tokenToMove: SceneToken, dx: number, dy: number) => {
      onStart();
      try {
        const updated = await apiRequest<SceneToken>(`/api/tokens/${tokenToMove.id}/move`, token, {
          method: "PATCH",
          body: JSON.stringify({
            x: Math.max(0, tokenToMove.x + dx),
            y: Math.max(0, tokenToMove.y + dy),
          }),
        });

        setSceneTokens((current) =>
          current.map((item) => (item.id === updated.id ? updated : item)),
        );

        const visionRadius = tokenToMove.vision_radius ?? 0;
        if (tokenToMove.character_id && visionRadius > 0 && selectedScene) {
          fogRevealAbortRef.current?.abort();
          const controller = new AbortController();
          fogRevealAbortRef.current = controller;

          const gridSize = selectedScene.grid_size ?? 50;
          const centerX = updated.x + (updated.size * gridSize) / 2;
          const centerY = updated.y + (updated.size * gridSize) / 2;
          apiRequest(`/api/tokens/${tokenToMove.id}/reveal`, token, {
            method: "POST",
            body: JSON.stringify({
              center_x: centerX,
              center_y: centerY,
              radius_ft: visionRadius,
            }),
            signal: controller.signal,
          }).catch((err) => {
            if (err?.name === "AbortError") return;
            onError("Révélation automatique du brouillard impossible.");
          });
        }
      } catch (error) {
        onError(error instanceof Error ? error.message : "Unable to move token");
      } finally {
        onEnd();
      }
    },
    [token, selectedScene, setSceneTokens, onError, onStart, onEnd],
  );

  const wrapSingle = useCallback(
    async (action: string, tokenToAct: SceneToken, value?: number) => {
      onStart();
      try {
        await performTokenAction(action, tokenToAct, value);
      } catch (error) {
        onError(error instanceof Error ? error.message : `Unable to ${action} token`);
      } finally {
        onEnd();
      }
    },
    [performTokenAction, onError, onStart, onEnd],
  );

  const wrapBatch = useCallback(
    async (action: string, tokens: SceneToken[], value?: number) => {
      onStart();
      try {
        for (const token of tokens) {
          await performTokenAction(action, token, value);
        }
        if (action === "delete") {
          onMessage?.(`${tokens.length} token(s) supprimé(s).`);
        }
      } catch (error) {
        onError(error instanceof Error ? error.message : `Unable to ${action} tokens`);
      } finally {
        onEnd();
      }
    },
    [performTokenAction, onError, onStart, onEnd],
  );

  return { moveToken, wrapSingle, wrapBatch };
}
