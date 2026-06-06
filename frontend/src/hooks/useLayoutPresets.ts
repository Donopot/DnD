import { useCallback, useState } from "react";
import type { FloatingPanelState } from "./useFloatingPanels";

// ─── Types ────────────────────────────────────────────────────────────────

export type LayoutPreset = {
  name: string;
  panels: {
    id: string;
    title: string;
    x: number;
    y: number;
    width: number;
    height: number;
    pinned: boolean;
    locked: boolean;
    minimized: boolean;
    maximized: boolean;
  }[];
  mode: string;
  createdAt: string;
};

const STORAGE_KEY = "dnd_presets_v1";

// ─── Helpers ──────────────────────────────────────────────────────────────

function loadPresets(): LayoutPreset[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as LayoutPreset[]) : [];
  } catch {
    return [];
  }
}

function savePresets(presets: LayoutPreset[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(presets));
  } catch {
    // silencieux
  }
}

// ─── Hook ──────────────────────────────────────────────────────────────────

export function useLayoutPresets() {
  const [presets, setPresets] = useState<LayoutPreset[]>(loadPresets);

  const save = useCallback(
    (
      name: string,
      panels: FloatingPanelState[],
      activeMode: string,
    ): LayoutPreset[] => {
      const now = new Date().toISOString();
      const snapshot = panels.map((p) => ({
        id: p.id,
        title: p.title,
        x: p.x,
        y: p.y,
        width: p.width,
        height: p.height,
        pinned: p.pinned,
        locked: p.locked,
        minimized: p.minimized,
        maximized: p.maximized,
      }));
      const preset: LayoutPreset = {
        name,
        panels: snapshot,
        mode: activeMode,
        createdAt: now,
      };
      // Replace existing preset with same name, or append
      const next = presets.filter((p) => p.name !== name).concat(preset);
      savePresets(next);
      setPresets(next);
      return next;
    },
    [presets],
  );

  const remove = useCallback(
    (name: string) => {
      const next = presets.filter((p) => p.name !== name);
      savePresets(next);
      setPresets(next);
    },
    [presets],
  );

  return { presets, save, remove } as const;
}
