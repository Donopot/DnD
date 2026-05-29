import { useState } from "react";

import type { Scene, SceneToken } from "../api/types";
import { applyFloatingWidgetPreset, showFloatingWidget } from "../hooks/useFloatingWidgets";
import type { FloatingWidgetPreset, VttPanelId } from "../config/vttPanels";

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

const quickPanels: Array<{ id: VttPanelId; label: string }> = [
  { id: "token-detail", label: "Détail token" },
  { id: "initiative", label: "Initiative" },
  { id: "party-summary", label: "Résumé groupe" },
  { id: "gm-notes", label: "Notes MJ" },
  { id: "scene", label: "Scènes" },
  { id: "token", label: "+ Token" },
];

const quickPresets: Array<{ id: FloatingWidgetPreset; label: string }> = [
  { id: "exploration", label: "Exploration" },
  { id: "combat", label: "Combat" },
  { id: "roleplay", label: "Roleplay" },
  { id: "quick-prep", label: "Prépa rapide" },
  { id: "minimal", label: "Minimal" },
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

  function handleRoll(label: string, sides: number) {
    setLastRoll({
      label,
      total: rollDie(sides),
      createdAt: new Date().toLocaleTimeString(),
    });
  }

  function handleShowPanel(panelId: VttPanelId) {
    showFloatingWidget(panelId);
  }

  function handleApplyPreset(preset: FloatingWidgetPreset) {
    applyFloatingWidgetPreset(preset);
  }

  function copySceneSummary() {
    const summary = [
      selectedScene ? `Scène active : ${selectedScene.name}` : "Aucune scène active",
      `Tokens sur scène : ${sceneTokens.length}`,
      selectedToken ? `Token sélectionné : ${selectedToken.name}` : "Aucun token sélectionné",
    ].join("\n");

    void navigator.clipboard?.writeText(summary);
  }

  return (
    <div className="quick-actions-panel">
      <section>
        <strong>Contexte</strong>

        <div className="quick-actions-context">
          <span>
            Scène
            <b>{selectedScene?.name ?? "Aucune"}</b>
          </span>

          <span>
            Token
            <b>{selectedToken?.name ?? "Aucun"}</b>
          </span>

          <span>
            Tokens
            <b>{sceneTokens.length}</b>
          </span>
        </div>
      </section>

      <section>
        <strong>Ouvrir un panneau</strong>

        <div className="quick-actions-grid">
          {quickPanels.map((panel) => (
            <button key={panel.id} onClick={() => handleShowPanel(panel.id)} type="button">
              {panel.label}
            </button>
          ))}
        </div>
      </section>

      <section>
        <strong>Modes Session Live</strong>

        <div className="quick-actions-grid">
          {quickPresets.map((preset) => (
            <button key={preset.id} onClick={() => handleApplyPreset(preset.id)} type="button">
              {preset.label}
            </button>
          ))}
        </div>
      </section>

      <section>
        <strong>Dés rapides</strong>

        <div className="quick-actions-dice">
          <button onClick={() => handleRoll("d20", 20)} type="button">d20</button>
          <button onClick={() => handleRoll("d12", 12)} type="button">d12</button>
          <button onClick={() => handleRoll("d10", 10)} type="button">d10</button>
          <button onClick={() => handleRoll("d8", 8)} type="button">d8</button>
          <button onClick={() => handleRoll("d6", 6)} type="button">d6</button>
          <button onClick={() => handleRoll("d4", 4)} type="button">d4</button>
        </div>

        {lastRoll && (
          <p className="quick-actions-roll">
            {lastRoll.label} : <strong>{lastRoll.total}</strong>
            <small>{lastRoll.createdAt}</small>
          </p>
        )}
      </section>

      <section>
        <strong>Utilitaires</strong>

        <div className="quick-actions-grid">
          <button onClick={copySceneSummary} type="button">
            Copier résumé scène
          </button>

          <button onClick={() => handleShowPanel("minimap")} type="button">
            Afficher mini-map
          </button>
        </div>
      </section>
    </div>
  );
}
