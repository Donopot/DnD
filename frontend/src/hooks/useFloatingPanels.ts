import { useCallback, useEffect, useState } from "react";

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

const STORAGE_KEY = "dnd_floating_panels";
const DEFAULT_WIDTH = 340;
const DEFAULT_HEIGHT = 420;

// ─── Hook ──────────────────────────────────────────────────────────────────

export function useFloatingPanels() {
  const [panels, setPanels] = useState<FloatingPanelState[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
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
  });

  // Persist positions/sizes (exclude zIndex and minimized)
  useEffect(() => {
    const toSave: PersistedState[] = panels.map(({ id, title, x, y, width, height }) => ({
      id,
      title,
      x,
      y,
      width,
      height,
    }));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
  }, [panels]);

  const open = useCallback(
    (id: string, title: string, x?: number, y?: number) => {
      setPanels((prev) => {
        const existing = prev.find((p) => p.id === id);
        if (existing) {
          // Already open — restore if minimized, bring to front
          return prev.map((p) =>
            p.id === id
              ? { ...p, minimized: false, zIndex: Math.max(...prev.map((x) => x.zIndex), 1000) + 10 }
              : p,
          );
        }
        // New panel — place near center of viewport
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const newPanel: FloatingPanelState = {
          id,
          title,
          x: x ?? Math.max(50, (vw - DEFAULT_WIDTH) / 2),
          y: y ?? Math.max(50, (vh - DEFAULT_HEIGHT) / 2),
          width: DEFAULT_WIDTH,
          height: DEFAULT_HEIGHT,
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
    setPanels((prev) =>
      prev.map((p) => (p.id === id ? { ...p, minimized: !p.minimized } : p)),
    );
  }, []);

  const bringToFront = useCallback((id: string) => {
    setPanels((prev) => {
      const maxZ = Math.max(...prev.map((p) => p.zIndex), 1000);
      return prev.map((p) =>
        p.id === id ? { ...p, zIndex: maxZ + 10 } : p,
      );
    });
  }, []);

  const updatePosition = useCallback((id: string, x: number, y: number) => {
    setPanels((prev) =>
      prev.map((p) => (p.id === id ? { ...p, x, y } : p)),
    );
  }, []);

  const updateSize = useCallback(
    (id: string, width: number, height: number) => {
      setPanels((prev) =>
        prev.map((p) =>
          p.id === id
            ? { ...p, width: Math.max(200, width), height: Math.max(150, height) }
            : p,
        ),
      );
    },
    [],
  );

  return {
    panels,
    open,
    close,
    minimize,
    bringToFront,
    updatePosition,
    updateSize,
  };
}
