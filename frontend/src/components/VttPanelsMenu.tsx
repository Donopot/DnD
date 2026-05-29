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

type VttPanelsMenuProps = {
  enabled: boolean;
  onShowPanel: (panelId: string) => void;
  onResetPanels: () => void;
};

export function VttPanelsMenu({ enabled, onShowPanel, onResetPanels }: VttPanelsMenuProps) {
  return (
    <details className={`vtt-panels-menu ${enabled ? "active" : ""}`}>
      <summary>Panneaux</summary>

      <div className="vtt-panels-menu-content">
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

        <button className="danger-lite" disabled={!enabled} onClick={onResetPanels} type="button">
          Reset complet
        </button>
      </div>
    </details>
  );
}
