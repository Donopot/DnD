export type SessionLiveMode =
  | "exploration"
  | "combat"
  | "roleplay"
  | "quick-prep"
  | "minimal";

export type SessionLiveModeDefinition = {
  id: SessionLiveMode;
  label: string;
  description: string;
};

export const SESSION_LIVE_MODES: SessionLiveModeDefinition[] = [
  {
    id: "exploration",
    label: "Exploration",
    description: "Scènes, mini-map, découverte, pièges et contexte.",
  },
  {
    id: "combat",
    label: "Combat",
    description: "Initiative, token sélectionné, actions rapides et journal combat.",
  },
  {
    id: "roleplay",
    label: "Roleplay",
    description: "PNJ, relations, secrets, notes MJ et documents révélables.",
  },
  {
    id: "quick-prep",
    label: "Préparation rapide",
    description: "Créer ou ajuster une scène sans quitter la session.",
  },
  {
    id: "minimal",
    label: "Minimal",
    description: "Carte dominante, détail token compact et journal réduit.",
  },
];
