import { VTT_PANEL_PRESETS, VTT_PANELS, type FloatingWidgetPreset, type VttPanelId } from "../config/vttPanels";

type VttPanelsMenuProps = {
  enabled: boolean;
  onShowPanel: (panelId: VttPanelId) => void;
  onApplyPreset: (preset: FloatingWidgetPreset) => void;
  onSaveCustomPreset: () => void;
  onResetPanels: () => void;
};

const categoryLabels: Record<string, string> = {
  session: "Session",
  map: "Carte",
  combat: "Combat",
  preparation: "Préparation",
  system: "Système",
};

export function VttPanelsMenu({
  enabled,
  onShowPanel,
  onApplyPreset,
  onSaveCustomPreset,
  onResetPanels,
}: VttPanelsMenuProps) {
  const categories = Array.from(new Set(VTT_PANELS.map((panel) => panel.category)));

  return (
    <details className={`vtt-panels-menu ${enabled ? "active" : ""}`}>
      <summary>Panneaux</summary>

      <div className="vtt-panels-menu-content" role="menu">
        <header className="vtt-panels-manager-header">
          <span>Gestion de l’espace MJ</span>
          <strong>{enabled ? "Mode avancé actif" : "Les presets et panneaux activent le mode avancé"}</strong>
        </header>

        <section className="vtt-panels-menu-group">
          <strong>Layouts</strong>

          <div className="vtt-panels-preset-grid">
            {VTT_PANEL_PRESETS.map((preset) => (
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
        </section>

        <section className="vtt-panels-menu-group">
          <strong>Layout personnalisé</strong>

          <button
            className="save-layout-button"
            disabled={!enabled}
            onClick={onSaveCustomPreset}
            type="button"
          >
            <span>Sauvegarder layout actuel</span>
            <small>Positions, tailles, panneaux fermés, réduits, verrouillés et épinglés</small>
          </button>
        </section>

        <section className="vtt-panels-menu-group">
          <strong>Afficher un panneau</strong>

          {categories.map((category) => (
            <div className="vtt-panels-category" key={category}>
              <span>{categoryLabels[category] ?? category}</span>

              <div className="vtt-panels-list">
                {VTT_PANELS.filter((panel) => panel.category === category).map((panel) => (
                  <button key={panel.id} onClick={() => onShowPanel(panel.id)} type="button">
                    <span>{panel.label}</span>
                    <small>{panel.description}</small>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </section>

        <footer className="vtt-panels-manager-footer">
          <button className="danger-lite" disabled={!enabled} onClick={onResetPanels} type="button">
            Réinitialiser l’espace MJ
          </button>
        </footer>
      </div>
    </details>
  );
}
