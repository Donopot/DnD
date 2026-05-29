import type { FloatingWidgetPreset } from "../hooks/useFloatingWidgets";

type FloatingPanelItem = {
  id: string;
  label: string;
  description: string;
};

const panels: FloatingPanelItem[] = [
  { id: "minimap", label: "Mini-map", description: "Vue globale de la scène" },
  { id: "token-detail", label: "Détail token", description: "Token sélectionné" },
  { id: "scene", label: "Scène", description: "Créer / configurer une scène" },
  { id: "upload-map", label: "Upload carte", description: "Ajouter une image de carte" },
  { id: "background", label: "Fond de carte", description: "Choisir le fond actif" },
  { id: "token", label: "Ajout token", description: "Placer un nouveau token" },
  { id: "tokens", label: "Liste tokens", description: "Voir les tokens de scène" },
];

const presets: Array<{ id: FloatingWidgetPreset; label: string; hint: string }> = [
  { id: "exploration", label: "Exploration", hint: "Carte + mini-map + contexte" },
  { id: "combat", label: "Combat", hint: "Tokens + actions rapides" },
  { id: "preparation", label: "Préparation", hint: "Scènes, cartes et tokens" },
  { id: "custom", label: "Personnalisé", hint: "Ton layout sauvegardé" },
];

type VttPanelsMenuProps = {
  enabled: boolean;
  onShowPanel: (panelId: string) => void;
  onApplyPreset: (preset: FloatingWidgetPreset) => void;
  onSaveCustomPreset: () => void;
  onResetPanels: () => void;
};

export function VttPanelsMenu({
  enabled,
  onShowPanel,
  onApplyPreset,
  onSaveCustomPreset,
  onResetPanels,
}: VttPanelsMenuProps) {
  return (
    <details className={`vtt-panels-menu ${enabled ? "active" : ""}`}>
      <summary>Gestion panneaux</summary>

      <div className="vtt-panels-menu-content" role="menu">
        <header className="vtt-panels-manager-header">
          <span>Gestionnaire MJ</span>
          <strong>{enabled ? "Mode avancé actif" : "Les presets activent le mode avancé"}</strong>
        </header>

        <section className="vtt-panels-menu-group">
          <strong>Presets toujours accessibles</strong>

          <div className="vtt-panels-preset-grid">
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
            <small>Positions, tailles, panneaux fermés, réduits et verrouillés</small>
          </button>
        </section>

        <section className="vtt-panels-menu-group">
          <strong>Afficher un panneau</strong>

          <div className="vtt-panels-list">
            {panels.map((panel) => (
              <button
                disabled={!enabled}
                key={panel.id}
                onClick={() => onShowPanel(panel.id)}
                type="button"
              >
                <span>{panel.label}</span>
                <small>{panel.description}</small>
              </button>
            ))}
          </div>
        </section>

        <footer className="vtt-panels-manager-footer">
          <button className="danger-lite" disabled={!enabled} onClick={onResetPanels} type="button">
            Reset complet
          </button>
        </footer>
      </div>
    </details>
  );
}
