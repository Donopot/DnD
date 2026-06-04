import { Plus, Trash2, Zap } from "lucide-react";
import { useState } from "react";

type Macro = {
  id: string;
  label: string;
  formula: string;
  color?: string;
};

type QuickActionsProps = {
  onRoll: (formula: string, label: string, mode: "normal" | "advantage" | "disadvantage") => void;
};

const DEFAULT_MACROS: Macro[] = [
  { id: "init", label: "Initiative", formula: "1d20", color: "#c5b358" },
  { id: "atk", label: "Attaque", formula: "1d20", color: "#ef4444" },
  { id: "dmg", label: "Dégâts", formula: "1d8", color: "#f97316" },
  { id: "perc", label: "Perception", formula: "1d20", color: "#22c55e" },
  { id: "save", label: "Sauvegarde", formula: "1d20", color: "#3b82f6" },
  { id: "heal", label: "Soin", formula: "1d8", color: "#8b5cf6" },
];

export function QuickActions({ onRoll }: QuickActionsProps) {
  const [macros, setMacros] = useState<Macro[]>(() => {
    try {
      const stored = localStorage.getItem("dnd_macros");
      return stored ? JSON.parse(stored) : DEFAULT_MACROS;
    } catch {
      return DEFAULT_MACROS;
    }
  });
  const [editing, setEditing] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [newFormula, setNewFormula] = useState("1d20");
  const [newColor, setNewColor] = useState("#c5b358");

  function saveMacros(updated: Macro[]) {
    setMacros(updated);
    localStorage.setItem("dnd_macros", JSON.stringify(updated));
  }

  function addMacro() {
    if (!newLabel.trim()) return;
    const macro: Macro = {
      id: crypto.randomUUID(),
      label: newLabel.trim(),
      formula: newFormula,
      color: newColor,
    };
    saveMacros([...macros, macro]);
    setNewLabel("");
    setNewFormula("1d20");
  }

  function removeMacro(id: string) {
    saveMacros(macros.filter((m) => m.id !== id));
  }

  function resetToDefaults() {
    saveMacros(DEFAULT_MACROS);
  }

  return (
    <div className="gm-panel-content quick-actions" data-vtt-panel>
      <div className="qa-bar">
        {macros.map((m) => (
          <button
            key={m.id}
            className="qa-btn"
            style={{ borderColor: m.color || "#c5b358", color: m.color || "#c5b358" }}
            onClick={() => onRoll(m.formula, m.label, "normal")}
            title={`${m.label}: ${m.formula}`}
            type="button"
          >
            <Zap size={10} />
            <span className="qa-label">{m.label}</span>
            <span className="qa-formula">{m.formula}</span>
          </button>
        ))}
      </div>

      {editing && (
        <div className="qa-editor">
          <div className="qa-add-row">
            <input
              type="text"
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              placeholder="Nom"
              className="qa-input"
            />
            <input
              type="text"
              value={newFormula}
              onChange={(e) => setNewFormula(e.target.value)}
              placeholder="Formule"
              className="qa-input-sm"
            />
            <input
              type="color"
              value={newColor}
              onChange={(e) => setNewColor(e.target.value)}
              className="qa-color"
            />
            <button onClick={addMacro} className="combat-btn primary" type="button">
              <Plus size={12} />
            </button>
          </div>
          <div className="qa-macro-list">
            {macros.map((m) => (
              <div key={m.id} className="qa-macro-item">
                <span style={{ color: m.color }}>●</span>
                <span>{m.label}</span>
                <span className="gm-panel-muted">{m.formula}</span>
                <button onClick={() => removeMacro(m.id)} className="inv-remove" type="button">
                  <Trash2 size={10} />
                </button>
              </div>
            ))}
          </div>
          <button onClick={resetToDefaults} className="ghost-button compact" type="button">
            Reset par défaut
          </button>
        </div>
      )}

      <button onClick={() => setEditing(!editing)} className="ghost-button compact" type="button">
        {editing ? "Fermer" : "⚙️ Éditer les macros"}
      </button>
    </div>
  );
}
