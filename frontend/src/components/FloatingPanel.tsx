import {
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  useCallback,
  useRef,
  useState,
} from "react";
import { GripHorizontal, Minimize2, Maximize2, X } from "lucide-react";
import type { FloatingPanelState } from "../hooks/useFloatingPanels";

// ─── Types ────────────────────────────────────────────────────────────────

type FloatingPanelProps = {
  panel: FloatingPanelState;
  children: ReactNode;
  onClose: () => void;
  onMinimize: () => void;
  onBringToFront: () => void;
  onMove: (x: number, y: number) => void;
  onResize: (w: number, h: number) => void;
};

// ─── Component ────────────────────────────────────────────────────────────

export function FloatingPanel({
  panel,
  children,
  onClose,
  onMinimize,
  onBringToFront,
  onMove,
  onResize,
}: FloatingPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);
  const [resizing, setResizing] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });

  // ── Drag handlers ────────────────────────────────────────────────────
  const onDragStart = useCallback(
    (e: ReactPointerEvent) => {
      e.preventDefault();
      onBringToFront();
      setDragging(true);
      dragOffset.current = {
        x: e.clientX - panel.x,
        y: e.clientY - panel.y,
      };
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    [panel.x, panel.y, onBringToFront],
  );

  const onDragMove = useCallback(
    (e: ReactPointerEvent) => {
      if (!dragging) return;
      const newX = e.clientX - dragOffset.current.x;
      const newY = e.clientY - dragOffset.current.y;
      // Clamp to viewport
      const clampedX = Math.max(0, Math.min(newX, window.innerWidth - 50));
      const clampedY = Math.max(0, Math.min(newY, window.innerHeight - 50));
      onMove(clampedX, clampedY);
    },
    [dragging, onMove],
  );

  const onDragEnd = useCallback(() => {
    setDragging(false);
  }, []);

  // ── Resize handlers ──────────────────────────────────────────────────
  const onResizeStart = useCallback(
    (e: ReactPointerEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setResizing(true);
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    [],
  );

  const onResizeMove = useCallback(
    (e: ReactPointerEvent) => {
      if (!resizing) return;
      const w = e.clientX - panel.x;
      const h = e.clientY - panel.y;
      onResize(w, h);
    },
    [resizing, panel.x, panel.y, onResize],
  );

  const onResizeEnd = useCallback(() => {
    setResizing(false);
  }, []);

  // ── Render ───────────────────────────────────────────────────────────
  return (
    <div
      ref={panelRef}
      className={`floating-panel${panel.minimized ? " minimized" : ""}${dragging ? " dragging" : ""}${resizing ? " resizing" : ""}`}
      style={{
        left: panel.x,
        top: panel.y,
        width: panel.width,
        height: panel.minimized ? "auto" : panel.height,
        zIndex: panel.zIndex,
      }}
      onPointerDown={onBringToFront}
    >
      {/* Title bar */}
      <div
        className="floating-panel-titlebar"
        onPointerDown={onDragStart}
        onPointerMove={onDragMove}
        onPointerUp={onDragEnd}
      >
        <GripHorizontal size={14} className="drag-handle-icon" />
        <span className="floating-panel-title">{panel.title}</span>
        <div className="floating-panel-actions">
          <button
            className="floating-panel-btn"
            onClick={(e) => {
              e.stopPropagation();
              onMinimize();
            }}
            title={panel.minimized ? "Restaurer" : "Réduire"}
            type="button"
          >
            {panel.minimized ? <Maximize2 size={14} /> : <Minimize2 size={14} />}
          </button>
          <button
            className="floating-panel-btn floating-panel-btn-close"
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            title="Fermer"
            type="button"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Content */}
      {!panel.minimized && (
        <div className="floating-panel-content">{children}</div>
      )}

      {/* Resize handle */}
      {!panel.minimized && (
        <div
          className="floating-panel-resize-handle"
          onPointerDown={onResizeStart}
          onPointerMove={onResizeMove}
          onPointerUp={onResizeEnd}
        />
      )}
    </div>
  );
}
