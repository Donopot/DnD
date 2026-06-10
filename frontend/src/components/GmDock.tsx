import { ChevronUp, Dice5, MessageSquare, Music, ScrollText, Swords } from "lucide-react";
import { useState } from "react";

// ── Types ──────────────────────────────────────────────────────────────────

export type DockTab = "initiative" | "chat" | "dice" | "journal" | "ambiance";

type DockTabDef = {
  id: DockTab;
  label: string;
  icon: React.ReactNode;
};

const TABS: DockTabDef[] = [
  { id: "initiative", label: "Initiative", icon: <Swords size={16} /> },
  { id: "chat", label: "Chat", icon: <MessageSquare size={16} /> },
  { id: "dice", label: "Dés", icon: <Dice5 size={16} /> },
  { id: "journal", label: "Journal", icon: <ScrollText size={16} /> },
  { id: "ambiance", label: "Ambiance", icon: <Music size={16} /> },
];

// ── Component ───────────────────────────────────────────────────────────────

export function GmDock() {
  const [expanded, setExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<DockTab>("initiative");

  return (
    <div className={`gm-dock${expanded ? " expanded" : ""}`}>
      {/* Toggle bar — always visible */}
      <button
        type="button"
        className="gm-dock-toggle"
        onClick={() => setExpanded((v) => !v)}
        aria-label={expanded ? "Réduire le dock" : "Ouvrir le dock"}
        aria-expanded={expanded}
      >
        <ChevronUp size={14} className={`gm-dock-chevron${expanded ? " open" : ""}`} />
        <span className="gm-dock-label">Dock</span>
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="gm-dock-body">
          {/* Tab bar */}
          <nav className="gm-dock-tabs" aria-label="Dock">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                className={`gm-dock-tab${activeTab === tab.id ? " active" : ""}`}
                onClick={() => setActiveTab(tab.id)}
                aria-label={tab.label}
                aria-selected={activeTab === tab.id}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>

          {/* Tab content — placeholder for now */}
          <div className="gm-dock-content">
            {/* Will be wired to actual panels in a future sprint */}
            <p className="gm-dock-placeholder">
              {activeTab === "initiative" && "Tour d'initiative — à venir"}
              {activeTab === "chat" && "Chat de session — à venir"}
              {activeTab === "dice" && "Lancer de dés — à venir"}
              {activeTab === "journal" && "Journal rapide — à venir"}
              {activeTab === "ambiance" && "Ambiance musicale — à venir"}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
