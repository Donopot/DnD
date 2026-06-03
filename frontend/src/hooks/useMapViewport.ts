import { useCallback, useEffect, useRef, useState } from "react";

// ─── Constants ────────────────────────────────────────────────────────────

export const MIN_ZOOM = 0.25;
export const MAX_ZOOM = 3.0;
export const ZOOM_STEP = 0.1;

// ─── Types ────────────────────────────────────────────────────────────────

export type ViewportState = {
  scrollLeft: number;
  scrollTop: number;
  zoom: number;
};

export type UseMapViewportParams = {
  /** Scene width in world pixels */
  sceneWidth: number;
  /** Scene height in world pixels */
  sceneHeight: number;
  /** Stable scene id for localStorage key */
  sceneId: string;
};

// ─── Persistence ──────────────────────────────────────────────────────────

const STORAGE_PREFIX = "dnd_map_viewport_";

function loadViewport(sceneId: string): ViewportState | null {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + sceneId);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (
      typeof parsed.scrollLeft === "number" &&
      typeof parsed.scrollTop === "number" &&
      typeof parsed.zoom === "number"
    ) {
      return parsed;
    }
  } catch {
    /* corrupted data — ignore */
  }
  return null;
}

function saveViewport(sceneId: string, state: ViewportState): void {
  try {
    localStorage.setItem(STORAGE_PREFIX + sceneId, JSON.stringify(state));
  } catch {
    /* quota exceeded — ignore */
  }
}

// ─── Hook ─────────────────────────────────────────────────────────────────

export function useMapViewport({
  sceneWidth,
  sceneHeight,
  sceneId,
}: UseMapViewportParams) {
  // ── Refs ──────────────────────────────────────────────────────────────

  const scrollRef = useRef<HTMLDivElement>(null);
  const prevSceneId = useRef(sceneId);
  const restoredRef = useRef(false);

  // ── State ─────────────────────────────────────────────────────────────

  const [viewportState, setViewportStateRaw] = useState<ViewportState>(() => {
    const persisted = loadViewport(sceneId);
    if (persisted) {
      restoredRef.current = true;
      return persisted;
    }
    return { scrollLeft: 0, scrollTop: 0, zoom: 1 };
  });

  const { zoom, scrollLeft, scrollTop } = viewportState;
  const zoomPercent = Math.round(zoom * 100);

  // ── Scene change → load persisted or center ───────────────────────────

  useEffect(() => {
    if (prevSceneId.current === sceneId) return;
    prevSceneId.current = sceneId;

    const persisted = loadViewport(sceneId);
    if (persisted) {
      restoredRef.current = true;
      setViewportStateRaw(persisted);
    } else {
      restoredRef.current = false;
      // Center the scene — compute from DOM if available, else default
      const el = scrollRef.current;
      const vw = el?.clientWidth ?? 1000;
      const vh = el?.clientHeight ?? 700;
      setViewportStateRaw({
        scrollLeft: Math.max(0, (sceneWidth - vw) / 2),
        scrollTop: Math.max(0, (sceneHeight - vh) / 2),
        zoom: 1,
      });
    }
  }, [sceneId, sceneWidth, sceneHeight]);

  // ── Sync scroll to DOM ───────────────────────────────────────────────

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollLeft = scrollLeft;
    el.scrollTop = scrollTop;
  }, [scrollLeft, scrollTop]);

  // ── Persist on every state change ─────────────────────────────────────

  const setViewportState = useCallback(
    (next: Partial<ViewportState>) => {
      setViewportStateRaw((prev) => {
        const merged = { ...prev, ...next };
        saveViewport(sceneId, merged);
        return merged;
      });
    },
    [sceneId],
  );

  // ── Zoom toward cursor ────────────────────────────────────────────────

  const zoomAt = useCallback(
    (
      delta: number,
      cursorX: number,
      cursorY: number,
    ) => {
      setViewportStateRaw((prev) => {
        const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, prev.zoom + delta));
        if (newZoom === prev.zoom) return prev;

        const scale = newZoom / prev.zoom;
        const newScrollLeft = (prev.scrollLeft + cursorX) * scale - cursorX;
        const newScrollTop = (prev.scrollTop + cursorY) * scale - cursorY;

        const next = { ...prev, zoom: newZoom, scrollLeft: newScrollLeft, scrollTop: newScrollTop };
        saveViewport(sceneId, next);
        return next;
      });
    },
    [sceneId],
  );

  const zoomIn = useCallback(
    (cursorX: number, cursorY: number) => zoomAt(ZOOM_STEP, cursorX, cursorY),
    [zoomAt],
  );

  const zoomOut = useCallback(
    (cursorX: number, cursorY: number) => zoomAt(-ZOOM_STEP, cursorX, cursorY),
    [zoomAt],
  );

  // ── Recenter ──────────────────────────────────────────────────────────

  const getCenteredPosition = useCallback(
    (viewportW: number, viewportH: number): { scrollLeft: number; scrollTop: number } => ({
      scrollLeft: Math.max(0, (sceneWidth - viewportW) / 2),
      scrollTop: Math.max(0, (sceneHeight - viewportH) / 2),
    }),
    [sceneWidth, sceneHeight],
  );

  const recenter = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const pos = getCenteredPosition(el.clientWidth, el.clientHeight);
    setViewportStateRaw({
      scrollLeft: pos.scrollLeft,
      scrollTop: pos.scrollTop,
      zoom: 1,
    });
    saveViewport(sceneId, { scrollLeft: pos.scrollLeft, scrollTop: pos.scrollTop, zoom: 1 });
  }, [getCenteredPosition, sceneId]);

  // ── Scroll by delta (for pan) ─────────────────────────────────────────

  const scrollBy = useCallback(
    (dx: number, dy: number) => {
      setViewportStateRaw((prev) => {
        const next = {
          ...prev,
          scrollLeft: prev.scrollLeft + dx,
          scrollTop: prev.scrollTop + dy,
        };
        saveViewport(sceneId, next);
        return next;
      });
    },
    [sceneId],
  );

  // ── Read scroll from DOM (for pan catch-up) ──────────────────────────

  const readScrollFromDOM = useCallback((): ViewportState => {
    const el = scrollRef.current;
    if (!el) return viewportState;
    return {
      scrollLeft: el.scrollLeft,
      scrollTop: el.scrollTop,
      zoom,
    };
  }, [zoom, viewportState]);

  return {
    scrollRef,
    zoom,
    zoomPercent,
    viewportState,
    setViewportState,
    zoomIn,
    zoomOut,
    recenter,
    getCenteredPosition,
    scrollBy,
    readScrollFromDOM,
    /** true if the viewport was restored from localStorage (not fresh-centered) */
    restoredFromPersistence: restoredRef.current,
  };
}
