import { useCallback, useEffect, useRef, useState } from "react";
import type { FogZone } from "../components/FogLayer";

export type UseFogOfWarInput = {
  selectedSceneId: string | undefined;
  wsRef: React.RefObject<WebSocket | null>;
};

export type UseFogOfWarReturn = {
  fogZones: FogZone[];
  showFog: boolean;
  setShowFog: React.Dispatch<React.SetStateAction<boolean>>;
  fogDrawMode: boolean;
  setFogDrawMode: React.Dispatch<React.SetStateAction<boolean>>;
  fogCircleMode: boolean;
  setFogCircleMode: React.Dispatch<React.SetStateAction<boolean>>;
  fogEraseMode: boolean;
  setFogEraseMode: React.Dispatch<React.SetStateAction<boolean>>;
  fogDrawing: boolean;
  setFogDrawing: React.Dispatch<React.SetStateAction<boolean>>;
  fogStart: { x: number; y: number };
  setFogStart: React.Dispatch<React.SetStateAction<{ x: number; y: number }>>;
  fogCurrentRect: FogZone | null;
  setFogCurrentRect: React.Dispatch<React.SetStateAction<FogZone | null>>;
  fogSaveError: string;
  setFogSaveError: React.Dispatch<React.SetStateAction<string>>;
  saveFogZones: (zones: FogZone[]) => void;
  isInFogZone: (px: number, py: number, zone: FogZone) => boolean;
};

export function useFogOfWar({
  selectedSceneId,
  wsRef,
}: UseFogOfWarInput): UseFogOfWarReturn {
  // ── Fog zone state ────────────────────────────────────────
  const [fogZones, setFogZones] = useState<FogZone[]>([]);
  const fogZonesRef = useRef(fogZones);
  fogZonesRef.current = fogZones;

  const fogSaveTimerRef = useRef<number | null>(null);
  const ignoreNextFogWsRef = useRef(false);
  const pendingFogZonesRef = useRef<FogZone[] | null>(null);
  const previousFogZonesRef = useRef<FogZone[] | null>(null);

  // ── Fog tool state ───────────────────────────────────────
  const [showFog, setShowFog] = useState(true);
  const [fogDrawMode, setFogDrawMode] = useState(false);
  const [fogCircleMode, setFogCircleMode] = useState(false);
  const [fogEraseMode, setFogEraseMode] = useState(false);
  const [fogDrawing, setFogDrawing] = useState(false);
  const [fogStart, setFogStart] = useState({ x: 0, y: 0 });
  const [fogCurrentRect, setFogCurrentRect] = useState<FogZone | null>(null);
  const [fogSaveError, setFogSaveError] = useState("");

  // ── Fog zone loading (on scene change) ──────────────────
  const fogAbortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!selectedSceneId) {
      setFogZones([]);
      return;
    }
    fogAbortRef.current?.abort();
    const controller = new AbortController();
    fogAbortRef.current = controller;
    const t = localStorage.getItem("dnd_access_token") || "";
    fetch(`/api/scenes/${selectedSceneId}/fog`, {
      headers: { Authorization: `Bearer ${t}` },
      signal: controller.signal,
    })
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((d) => setFogZones(d.fog_zones || []))
      .catch((err) => {
        if (err?.name === "AbortError") return;
      });
    return () => controller.abort();
  }, [selectedSceneId]);

  // ── Persist fog zones (raw API call) ────────────────────
  const fogSaveAbortRef = useRef<AbortController | null>(null);

  const persistFogZones = useCallback(
    async (newZones: FogZone[]) => {
      const t = localStorage.getItem("dnd_access_token") ?? "";

      fogSaveAbortRef.current?.abort();
      const controller = new AbortController();
      fogSaveAbortRef.current = controller;

      try {
        const res = await fetch(`/api/scenes/${selectedSceneId}/fog`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${t}`,
          },
          body: JSON.stringify({ fog_zones: newZones }),
          signal: controller.signal,
        });

        if (!res.ok) throw new Error(`Fog save failed (${res.status})`);

        previousFogZonesRef.current = null;
        ignoreNextFogWsRef.current = true;
        setFogSaveError("");
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        if (previousFogZonesRef.current) {
          setFogZones(previousFogZonesRef.current);
        }
        pendingFogZonesRef.current = null;
        setFogSaveError("Sauvegarde du brouillard impossible.");
      }
    },
    [selectedSceneId],
  );

  // ── Debounced fog zone save ──────────────────────────────
  const saveFogZones = useCallback(
    (newZones: FogZone[]) => {
      if (
        newZones.some(
          (zone) =>
            !Number.isFinite(zone.x) ||
            !Number.isFinite(zone.y) ||
            !Number.isFinite(zone.width) ||
            !Number.isFinite(zone.height) ||
            zone.width <= 0 ||
            zone.height <= 0,
        )
      ) {
        setFogSaveError("Zone de brouillard invalide.");
        return;
      }

      previousFogZonesRef.current = fogZonesRef.current;
      setFogZones(newZones);
      pendingFogZonesRef.current = newZones;

      if (fogSaveTimerRef.current) {
        window.clearTimeout(fogSaveTimerRef.current);
      }

      fogSaveTimerRef.current = window.setTimeout(() => {
        if (pendingFogZonesRef.current) {
          void persistFogZones(pendingFogZonesRef.current);
        }
        pendingFogZonesRef.current = null;
        fogSaveTimerRef.current = null;
      }, 350);
    },
    [persistFogZones],
  );

  // ── Cleanup fog save timer on unmount ────────────────────
  useEffect(() => {
    return () => {
      if (fogSaveTimerRef.current) {
        window.clearTimeout(fogSaveTimerRef.current);
      }
    };
  }, []);

  // ── Fog zone WebSocket refresh (self-ignore aware) ───────
  const fogSyncAbortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const ws = wsRef.current;
    if (!ws) return;

    const handler = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        if (
          data.type === "session_changed" &&
          data.resource === "fog" &&
          data.scene_id === selectedSceneId
        ) {
          if (ignoreNextFogWsRef.current) {
            ignoreNextFogWsRef.current = false;
            return;
          }

          fogSyncAbortRef.current?.abort();
          const controller = new AbortController();
          fogSyncAbortRef.current = controller;

          const t = localStorage.getItem("dnd_access_token") || "";
          fetch(`/api/scenes/${selectedSceneId}/fog`, {
            headers: { Authorization: `Bearer ${t}` },
            signal: controller.signal,
          })
            .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
            .then((d) => setFogZones(d.fog_zones || []))
            .catch((err) => {
              if (err?.name === "AbortError") return;
            });
        }
      } catch {
        /* ignore */
      }
    };

    ws.addEventListener("message", handler);
    return () => {
      ws.removeEventListener("message", handler);
      fogSyncAbortRef.current?.abort();
    };
  }, [wsRef, selectedSceneId]);

  // ── Helper: is a point inside a fog zone? ────────────────
  const isInFogZone = useCallback(
    (px: number, py: number, zone: FogZone) => {
      if (zone.shape === "circle") {
        const cx = zone.x + zone.width / 2;
        const cy = zone.y + zone.height / 2;
        const r = zone.width / 2;
        return (px - cx) ** 2 + (py - cy) ** 2 <= r * r;
      }
      return px >= zone.x && px <= zone.x + zone.width && py >= zone.y && py <= zone.y + zone.height;
    },
    [],
  );

  return {
    fogZones,
    showFog,
    setShowFog,
    fogDrawMode,
    setFogDrawMode,
    fogCircleMode,
    setFogCircleMode,
    fogEraseMode,
    setFogEraseMode,
    fogDrawing,
    setFogDrawing,
    fogStart,
    setFogStart,
    fogCurrentRect,
    setFogCurrentRect,
    fogSaveError,
    setFogSaveError,
    saveFogZones,
    isInFogZone,
  };
}
