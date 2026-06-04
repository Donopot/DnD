import { useCallback, useRef } from "react";
import type { Scene, SceneToken } from "../api/types";
import { apiRequest } from "../api/client";

export interface UseTokenActionsOptions {
  token: string;
  selectedScene: Scene | undefined;
  setSceneTokens: React.Dispatch<React.SetStateAction<SceneToken[]>>;
  onError: (msg: string) => void;
  onStart: () => void;
  onEnd: () => void;
}

export interface UseTokenActionsReturn {
  moveToken: (tokenToMove: SceneToken, dx: number, dy: number) => Promise<void>;
}

export function useTokenActions(
  opts: UseTokenActionsOptions,
): UseTokenActionsReturn {
  const { token, selectedScene, setSceneTokens, onError, onStart, onEnd } = opts;
  const fogRevealAbortRef = useRef<AbortController | null>(null);

  const moveToken = useCallback(
    async (tokenToMove: SceneToken, dx: number, dy: number) => {
      onStart();
      try {
        const updated = await apiRequest<SceneToken>(
          `/api/tokens/${tokenToMove.id}/move`,
          token,
          {
            method: "PATCH",
            body: JSON.stringify({
              x: Math.max(0, tokenToMove.x + dx),
              y: Math.max(0, tokenToMove.y + dy),
            }),
          },
        );

        setSceneTokens((current) =>
          current.map((item) => (item.id === updated.id ? updated : item)),
        );

        // ── Auto fog reveal ──────────────────────────────────────
        const visionRadius = tokenToMove.vision_radius ?? 0;
        if (tokenToMove.character_id && visionRadius > 0 && selectedScene) {
          fogRevealAbortRef.current?.abort();
          const controller = new AbortController();
          fogRevealAbortRef.current = controller;

          const gridSize = selectedScene.grid_size ?? 50;
          const centerX = updated.x + (updated.size * gridSize) / 2;
          const centerY = updated.y + (updated.size * gridSize) / 2;
          fetch(`/api/tokens/${tokenToMove.id}/reveal`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              center_x: centerX,
              center_y: centerY,
              radius_ft: visionRadius,
            }),
            signal: controller.signal,
          }).catch((err) => {
            if (err?.name === "AbortError") return;
          });
        }
      } catch (error) {
        onError(
          error instanceof Error ? error.message : "Unable to move token",
        );
      } finally {
        onEnd();
      }
    },
    [token, selectedScene, setSceneTokens, onError, onStart, onEnd],
  );

  return { moveToken };
}
