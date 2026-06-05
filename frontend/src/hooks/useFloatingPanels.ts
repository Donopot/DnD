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
  pinned: boolean;
  locked: boolean;
  maximized: boolean;
  zIndex: number;
  /** Saved position/size before maximize, restored on un-maximize */
  _saved?: { x: number; y: number; width: number; height: number };
};

type PersistedState = Omit<FloatingPanelState, "zIndex" | "minimized" | "_saved">;

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
      pinned: p.pinned ?? false,
      locked: p.locked ?? false,
      maximized: false,
      minimized: false,
      zIndex: 1000 + i * 10,
    }));
  } catch {
    return [];
  }
}

function savePanels(key: string, panels: FloatingPanelState[]): void {
  try {
    const toSave: PersistedState[] = panels.map((p) => ({
      id: p.id,
      title: p.title,
      x: p.x,
      y: p.y,
      width: p.width,
      height: p.height,
      pinned: p.pinned,
      locked: p.locked,
      maximized: p.maximized,
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
          pinned: false,
          locked: false,
          maximized: false,
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

  const togglePin = useCallback((id: string) => {
    setPanels((prev) => prev.map((p) => (p.id === id ? { ...p, pinned: !p.pinned } : p)));
  }, []);

  const toggleLock = useCallback((id: string) => {
    setPanels((prev) => prev.map((p) => (p.id === id ? { ...p, locked: !p.locked } : p)));
  }, []);

  const toggleMaximize = useCallback((id: string) => {
    setPanels((prev) =>
      prev.map((p) => {
        if (p.id !== id) return p;
        if (p.maximized) {
          // Restore saved position/size
          const saved = p._saved;
          return {
            ...p,
            maximized: false,
            x: saved?.x ?? p.x,
            y: saved?.y ?? p.y,
            width: saved?.width ?? p.width,
            height: saved?.height ?? p.height,
            _saved: undefined,
          };
        }
        // Save current position/size and maximize
        return {
          ...p,
          maximized: true,
          _saved: { x: p.x, y: p.y, width: p.width, height: p.height },
          x: 0,
          y: 0,
          width: window.innerWidth,
          height: window.innerHeight,
        };
      }),
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
    togglePin,
    toggleLock,
    toggleMaximize,
    reset,
  };
}
