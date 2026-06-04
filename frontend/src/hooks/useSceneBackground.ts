import { useEffect, useState } from "react";
import type { Scene } from "../api/types";
import { authHeaders } from "../api/client";

/**
 * Loads a scene background image as a blob URL.
 * Used by both GM (App.tsx) and Player (PlayerView.tsx) views.
 */
export function useSceneBackground(scene: Scene | null | undefined, token: string): string {
  const [objectUrl, setObjectUrl] = useState("");

  useEffect(() => {
    if (!scene?.background_url || !token) {
      setObjectUrl("");
      return;
    }

    let cancelled = false;
    let url = "";

    async function load() {
      const response = await fetch(scene!.background_url!, {
        headers: authHeaders(token),
      });

      if (!response.ok) {
        throw new Error("Unable to load scene background");
      }

      const blob = await response.blob();
      url = URL.createObjectURL(blob);

      if (!cancelled) {
        setObjectUrl(url);
      }
    }

    void load().catch(() => {
      if (!cancelled) {
        setObjectUrl("");
      }
    });

    return () => {
      cancelled = true;
      if (url) {
        URL.revokeObjectURL(url);
      }
    };
  }, [scene?.background_url, token]);

  return objectUrl;
}
