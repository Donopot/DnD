import { useCallback, useEffect, useRef, useState } from "react";

// ─── Types ────────────────────────────────────────────────────────────────

export type FloatingPanelState = {
  id: string;
  title: string;
  x: number;
  y: number;
  width: number;
  height: number;
  minimized: boolean;
  zIndex: number;
};

type PersistedState = Omit<FloatingPanelState, "zIndex" | "minimized">;

const STORAGE_KEY_PREFIX = "dnd_fp_v1";
const DEFAULT_WIDTH = 340;
const DEFAULT_HEIGHT = 420;

function storageKey(campaignId?: string): string {
  return campaignId ? `${STORAGE_KEY_PREFIX}_${campaignId}` : STORAGE_KEY_PREFIX;
}

function loadPanels(key: string): FloatingPanelState[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const saved: PersistedState[] = JSON.parse(raw);
    return saved.map((p, i) => ({
      ...p,
      minimized: false,
      zIndex: 1000 + i * 10,
    }));
  } catch {
    return [];
  }
}

function savePanels(key: string, panels: FloatingPanelState[]): void {
  try {
    const toSave: PersistedState[] = panels.map(({ id, title, x, y, width, height }) => ({
      id,
      title,
      x,
      y,
      width,
      height,
    }));
    localStorage.setItem(key, JSON.stringify(toSave));
  } catch {
    // silencieux
  }
}

// ─── Hook ──────────────────────────────────────────────────────────────────

export function useFloatingPanels(campaignId?: string) {
  const key = storageKey(campaignId);
  const prevKeyRef = useRef(key);

  const [panels, setPanels] = useState<FloatingPanelState[]>(() => loadPanels(key));

  // Persist positions/sizes (exclude zIndex and minimized)
  useEffect(() => {
    savePanels(key, panels);
  }, [key, panels]);

  // Reload panels when campaign changes (key change = campaign switch)
  useEffect(() => {
    if (prevKeyRef.current !== key) {
      prevKeyRef.current = key;
      setPanels(loadPanels(key));
    }
  }, [key]);

  const reset = useCallback(() => {
    setPanels([]);
  }, []);

  const open = useCallback(
    (id: string, title: string, x?: number, y?: number, width?: number, height?: number) => {
      setPanels((prev) => {
        const existing = prev.find((p) => p.id === id);
        if (existing) {
          // Already open — restore if minimized, bring to front
          return prev.map((p) =>
            p.id === id
              ? {
                  ...p,
                  minimized: false,
                  zIndex: Math.max(...prev.map((x) => x.zIndex), 1000) + 10,
                }
              : p,
          );
        }
        // New panel — place near center of viewport
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const w = width ?? DEFAULT_WIDTH;
        const h = height ?? DEFAULT_HEIGHT;
        const newPanel: FloatingPanelState = {
          id,
          title,
          x: x ?? Math.max(50, (vw - w) / 2),
          y: y ?? Math.max(50, (vh - h) / 2),
          width: w,
          height: h,
          minimized: false,
          zIndex: Math.max(...prev.map((p) => p.zIndex), 1000) + 10,
        };
        return [...prev, newPanel];
      });
    },
    [],
  );

  const close = useCallback((id: string) => {
    setPanels((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const minimize = useCallback((id: string) => {
    setPanels((prev) => prev.map((p) => (p.id === id ? { ...p, minimized: !p.minimized } : p)));
  }, []);

  const bringToFront = useCallback((id: string) => {
    setPanels((prev) => {
      const maxZ = Math.max(...prev.map((p) => p.zIndex), 1000);
      return prev.map((p) => (p.id === id ? { ...p, zIndex: maxZ + 10 } : p));
    });
  }, []);

  const updatePosition = useCallback((id: string, x: number, y: number) => {
    setPanels((prev) => prev.map((p) => (p.id === id ? { ...p, x, y } : p)));
  }, []);

  const updateSize = useCallback((id: string, width: number, height: number) => {
    setPanels((prev) =>
      prev.map((p) =>
        p.id === id ? { ...p, width: Math.max(200, width), height: Math.max(150, height) } : p,
      ),
    );
  }, []);

  return {
    panels,
    open,
    close,
    minimize,
    bringToFront,
    updatePosition,
    updateSize,
    reset,
  };
}
