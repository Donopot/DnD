import { ExternalLink } from "lucide-react";
import type { FloatingPanelState } from "../hooks/useFloatingPanels";

type PanelDockProps = {
  panels: FloatingPanelState[];
  onRestore: (panelId: string) => void;
};

export function PanelDock({ panels, onRestore }: PanelDockProps) {
  const minimized = panels.filter((p) => p.minimized);

  if (minimized.length === 0) return null;

  return (
    <div className="panel-dock" role="toolbar" aria-label="Panneaux réduits">
      {minimized.map((p) => (
        <button
          key={p.id}
          type="button"
          className="panel-dock-item"
          onClick={() => onRestore(p.id)}
          title={`Restaurer ${p.title}`}
          aria-label={`Restaurer le panneau ${p.title}`}
        >
          <ExternalLink size={12} />
          <span>{p.title}</span>
        </button>
      ))}
    </div>
  );
}
