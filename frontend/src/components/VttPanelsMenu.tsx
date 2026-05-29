import type { FloatingWidgetPreset } from "../hooks/useFloatingWidgets";

type FloatingPanelItem = {
  id: string;
  label: string;
};

const panels: FloatingPanelItem[] = [
  { id: "minimap", label: "Mini-map" },
  { id: "token-detail", label: "Detail token" },
  { id: "scene", label: "Scene" },
  { id: "upload-map", label: "Upload carte" },
  { id: "background", label: "Fond de carte" },
  { id: "token", label: "Ajout token" },
  { id: "tokens", label: "Liste tokens" },
];

const presets: Array<{ id: FloatingWidgetPreset; label: string; hint: string }> = [
  { id: "exploration", label: "Exploration", hint: "Mini-map + token + outils essentiels" },
  { id: "combat", label: "Combat", hint: "Priorite tokens et table" },
  { id: "preparation", label: "Preparation", hint: "Scenes, assets et creation" },
];

type VttPanelsMenuProps = {
  enabled: boolean;
  onShowPanel: (panelId: string) => void;
  onApplyPreset: (preset: FloatingWidgetPreset) => void;
  onResetPanels: () => void;
};

export function VttPanelsMenu({
  enabled,
  onShowPanel,
  onApplyPreset,
  onResetPanels,
}: VttPanelsMenuProps) {
  return (
    <details className={`vtt-panels-menu ${enabled ? "active" : ""}`}>
      <summary>Panneaux</summary>

      <div className="vtt-panels-menu-content">
        <div className="vtt-panels-menu-notice">
          {enabled ? "Panneaux libres actifs" : "Choisir un preset active les panneaux libres"}
        </div>

        <div className="vtt-panels-menu-group">
          <strong>Presets</strong>

          {presets.map((preset) => (
            <button
              className="preset-button"
              key={preset.id}
              onClick={() => onApplyPreset(preset.id)}
              type="button"
            >
              <span>{preset.label}</span>
              <small>{preset.hint}</small>
            </button>
          ))}
        </div>

        <div className="vtt-panels-menu-group">
          <strong>Rouvrir</strong>

          {panels.map((panel) => (
            <button
              disabled={!enabled}
              key={panel.id}
              onClick={() => onShowPanel(panel.id)}
              type="button"
            >
              {panel.label}
            </button>
          ))}
        </div>

        <button className="danger-lite" disabled={!enabled} onClick={onResetPanels} type="button">
          Reset complet
        </button>
      </div>
    </details>
  );
}
