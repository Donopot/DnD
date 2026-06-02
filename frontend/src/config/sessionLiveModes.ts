import type { FloatingWidgetPreset } from "./vttPanels";

export type SessionLiveMode = "exploration" | "combat" | "roleplay" | "quick-prep" | "minimal";

export type SessionLiveModeDefinition = {
  id: SessionLiveMode;
  label: string;
  description: string;
  preset: FloatingWidgetPreset;
};

export const SESSION_LIVE_MODES: SessionLiveModeDefinition[] = [
  {
    id: "exploration",
    label: "Exploration",
    description: "Scènes, mini-map, découverte, pièges et contexte.",
    preset: "exploration",
  },
  {
    id: "combat",
    label: "Combat",
    description: "Initiative, token sélectionné, actions rapides et journal combat.",
    preset: "combat",
  },
  {
    id: "roleplay",
    label: "Roleplay",
    description: "PNJ, relations, secrets, notes MJ et documents révélables.",
    preset: "roleplay",
  },
  {
    id: "quick-prep",
    label: "Préparation rapide",
    description: "Créer ou ajuster une scène sans quitter la session.",
    preset: "quick-prep",
  },
  {
    id: "minimal",
    label: "Minimal",
    description: "Carte dominante, détail token compact et journal réduit.",
    preset: "minimal",
  },
];

export function getPresetForSessionLiveMode(mode: SessionLiveMode): FloatingWidgetPreset {
  return SESSION_LIVE_MODES.find((item) => item.id === mode)?.preset ?? "exploration";
}
