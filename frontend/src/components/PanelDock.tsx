import { ChevronRight, ExternalLink } from "lucide-react";
import { type PointerEvent as ReactPointerEvent, useCallback, useRef, useState } from "react";
import { getGmPanelLabel } from "../config/gmPanels";
import { GM_PANELS } from "../config/gmPanels";
import type { FloatingPanelState } from "../hooks/useFloatingPanels";

type PanelDockProps = {
  panels: FloatingPanelState[];
  onRestore: (panelId: string) => void;
  /** Map of panelId → notification count (0 = no badge) */
  notifications?: Record<string, number>;
};

/**
 * Barre de dock compacte affichant les panneaux réduits.
 * Icône emoji depuis le registre GM_PANELS, badge de notification,
 * et redimensionnement horizontal via la poignée droite.
 */
export function PanelDock({ panels, onRestore, notifications }: PanelDockProps) {
  const minimized = panels.filter((p) => p.minimized);

  const [dockWidth, setDockWidth] = useState<number>(() => {
    // Default dock width: 40px per minimized panel, min 200px
    return Math.max(200, minimized.length * 40 + 12);
  });

  const [resizing, setResizing] = useState(false);
  const resizeStart = useRef({ x: 0, width: 0 });

  const onResizeStart = useCallback(
    (e: ReactPointerEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setResizing(true);
      resizeStart.current = { x: e.clientX, width: dockWidth };
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    [dockWidth],
  );

  const onResizeMove = useCallback(
    (e: ReactPointerEvent) => {
      if (!resizing) return;
      const delta = e.clientX - resizeStart.current.x;
      setDockWidth(Math.max(160, resizeStart.current.width + delta));
    },
    [resizing],
  );

  const onResizeEnd = useCallback(() => setResizing(false), []);

  if (minimized.length === 0) return null;

  const getEmoji = (panelId: string): string =>
    GM_PANELS.find((p) => p.id === panelId)?.emoji ?? "📋";

  return (
    <div
      className={`panel-dock${resizing ? " resizing" : ""}`}
      role="toolbar"
      aria-label="Panneaux réduits"
      style={{ width: dockWidth }}
    >
      <div className="panel-dock-items">
        {minimized.map((p) => {
          const count = notifications?.[p.id] ?? 0;
          return (
            <button
              key={p.id}
              type="button"
              className="panel-dock-item"
              onClick={() => onRestore(p.id)}
              title={`Restaurer ${p.title}`}
              aria-label={`Restaurer le panneau ${p.title}`}
            >
              <span className="panel-dock-emoji" aria-hidden="true">
                {getEmoji(p.id)}
              </span>
              <span className="panel-dock-label">{getGmPanelLabel(p.id)}</span>
              {count > 0 && <span className="panel-dock-badge">{count > 99 ? "99+" : count}</span>}
            </button>
          );
        })}
      </div>

      {/* Horizontal resize handle */}
      <div
        className="panel-dock-resize-handle"
        onPointerDown={onResizeStart}
        onPointerMove={onResizeMove}
        onPointerUp={onResizeEnd}
      >
        <ChevronRight size={12} />
      </div>
    </div>
  );
}
