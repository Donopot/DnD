import { useState } from "react";

import type { Scene, SceneToken } from "../api/types";
import type { FloatingWidgetPreset, VttPanelId } from "../config/vttPanels";
import { applyFloatingWidgetPreset, showFloatingWidget } from "../hooks/useFloatingWidgets";

type QuickActionsPanelProps = {
  selectedScene: Scene | undefined;
  selectedToken: SceneToken | undefined;
  sceneTokens: SceneToken[];
};

type QuickRoll = {
  label: string;
  total: number;
  createdAt: string;
};

type QuickPanelAction = {
  id: VttPanelId;
  label: string;
  hint: string;
};

type QuickPresetAction = {
  id: FloatingWidgetPreset;
  label: string;
};

const quickPanels: QuickPanelAction[] = [
  { id: "token-detail", label: "Détail", hint: "Token" },
  { id: "visibility-inspector", label: "Visibilité", hint: "Joueurs" },
  { id: "initiative", label: "Initiative", hint: "Combat" },
  { id: "party-summary", label: "Groupe", hint: "PV / CA" },
  { id: "gm-notes", label: "Notes MJ", hint: "Privées" },
  { id: "scene", label: "Scènes", hint: "Carte" },
  { id: "token", label: "+ Token", hint: "Ajouter" },
  { id: "tokens", label: "Liste", hint: "Tokens" },
  { id: "minimap", label: "Mini-map", hint: "Vue globale" },
];

const quickPresets: QuickPresetAction[] = [
  { id: "exploration", label: "Exploration" },
  { id: "combat", label: "Combat" },
  { id: "roleplay", label: "Roleplay" },
  { id: "quick-prep", label: "Prépa" },
  { id: "minimal", label: "Minimal" },
];

const quickDice: Array<{ label: string; sides: number }> = [
  { label: "d20", sides: 20 },
  { label: "d12", sides: 12 },
  { label: "d10", sides: 10 },
  { label: "d8", sides: 8 },
  { label: "d6", sides: 6 },
  { label: "d4", sides: 4 },
];

function rollDie(sides: number) {
  return Math.floor(Math.random() * sides) + 1;
}

export function QuickActionsPanel({
  selectedScene,
  selectedToken,
  sceneTokens,
}: QuickActionsPanelProps) {
  const [lastRoll, setLastRoll] = useState<QuickRoll | null>(null);
  const [copyStatus, setCopyStatus] = useState("");

  function handleShowPanel(panelId: VttPanelId) {
    showFloatingWidget(panelId);
  }

  function handleApplyPreset(preset: FloatingWidgetPreset) {
    applyFloatingWidgetPreset(preset);
  }

  function handleRoll(label: string, sides: number) {
    setLastRoll({
      label,
      total: rollDie(sides),
      createdAt: new Date().toLocaleTimeString(),
    });
  }

  async function copySceneSummary() {
    const summary = [
      selectedScene ? `Scène active : ${selectedScene.name}` : "Aucune scène active",
      `Tokens sur scène : ${sceneTokens.length}`,
      selectedToken ? `Token sélectionné : ${selectedToken.name}` : "Aucun token sélectionné",
    ].join("\n");

    try {
      await navigator.clipboard?.writeText(summary);
      setCopyStatus("Copié");
    } catch {
      setCopyStatus("Copie impossible");
    }
  }

  return (
    <div className="quick-actions-panel quick-actions-panel-compact">
      <section className="quick-actions-context-card">
        <span>
          <small>Scène</small>
          <strong>{selectedScene?.name ?? "Aucune"}</strong>
        </span>

        <span>
          <small>Token</small>
          <strong>{selectedToken?.name ?? "Aucun"}</strong>
        </span>

        <span>
          <small>Tokens</small>
          <strong>{sceneTokens.length}</strong>
        </span>
      </section>

      <section className="quick-actions-section">
        <header>
          <strong>Ouvrir</strong>
          <small>Panneaux essentiels</small>
        </header>

        <div className="quick-actions-button-grid">
          {quickPanels.map((panel) => (
            <button key={panel.id} onClick={() => handleShowPanel(panel.id)} type="button">
              <strong>{panel.label}</strong>
              <small>{panel.hint}</small>
            </button>
          ))}
        </div>
      </section>

      <section className="quick-actions-section">
        <header>
          <strong>Layouts</strong>
          <small>Modes Session Live</small>
        </header>

        <div className="quick-actions-preset-row">
          {quickPresets.map((preset) => (
            <button key={preset.id} onClick={() => handleApplyPreset(preset.id)} type="button">
              {preset.label}
            </button>
          ))}
        </div>
      </section>

      <section className="quick-actions-section">
        <header>
          <strong>Dés</strong>
          <small>Jet rapide local</small>
        </header>

        <div className="quick-actions-dice-row">
          {quickDice.map((die) => (
            <button key={die.label} onClick={() => handleRoll(die.label, die.sides)} type="button">
              {die.label}
            </button>
          ))}
        </div>

        {lastRoll && (
          <p className="quick-actions-roll">
            <span>{lastRoll.label}</span>
            <strong>{lastRoll.total}</strong>
            <small>{lastRoll.createdAt}</small>
          </p>
        )}
      </section>

      <section className="quick-actions-section">
        <header>
          <strong>Utilitaires</strong>
          <small>Session</small>
        </header>

        <div className="quick-actions-utility-row">
          <button onClick={copySceneSummary} type="button">
            Copier résumé
          </button>

          <button onClick={() => handleShowPanel("minimap")} type="button">
            Mini-map
          </button>
        </div>

        {copyStatus && <small className="quick-actions-copy-status">{copyStatus}</small>}
      </section>
    </div>
  );
}
