import {
  BookOpen,
  Layers,
  Map as MapIcon,
  ScrollText,
  Settings,
  Swords,
  Users,
} from "lucide-react";
import type { ReactNode } from "react";

// ── Types ──────────────────────────────────────────────────────────────────

/** Les 7 sections du rail. L'ordre est intentionnel. */
export type RailSection =
  | "map"
  | "scenes"
  | "combat"
  | "characters"
  | "library"
  | "journal"
  | "settings";

export type GmRailProps = {
  active: RailSection;
  onSelect: (section: RailSection) => void;
};

// ── Configuration ───────────────────────────────────────────────────────────

type RailEntry = {
  id: RailSection;
  label: string;
  icon: ReactNode;
};

const ENTRIES: RailEntry[] = [
  { id: "map", label: "Carte", icon: <MapIcon size={20} /> },
  { id: "scenes", label: "Scènes", icon: <Layers size={20} /> },
  { id: "combat", label: "Combat", icon: <Swords size={20} /> },
  { id: "characters", label: "Personnages", icon: <Users size={20} /> },
  { id: "library", label: "Bibliothèque", icon: <BookOpen size={20} /> },
  { id: "journal", label: "Journal", icon: <ScrollText size={20} /> },
  { id: "settings", label: "Paramètres", icon: <Settings size={20} /> },
];

// ── Component ───────────────────────────────────────────────────────────────

export function GmRail({ active, onSelect }: GmRailProps) {
  return (
    <nav className="gm-rail" aria-label="Navigation principale">
      {/* Brand mark — top */}
      <div className="gm-rail-brand" aria-hidden="true">
        <Swords size={22} />
      </div>

      {/* Sections */}
      <ul className="gm-rail-sections">
        {ENTRIES.map((entry) => (
          <li key={entry.id}>
            <button
              type="button"
              className={`gm-rail-btn${active === entry.id ? " active" : ""}`}
              onClick={() => onSelect(entry.id)}
              aria-label={entry.label}
              aria-current={active === entry.id ? "page" : undefined}
            >
              {entry.icon}
            </button>
          </li>
        ))}
      </ul>

      {/* Spacer pushes nothing to bottom for now */}
      <div className="gm-rail-spacer" />
    </nav>
  );
}
