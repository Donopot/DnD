import type { GmPanelId } from "./gmPanels";

export type SessionLiveMode = "exploration" | "combat" | "roleplay" | "quick-prep" | "minimal";

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

// ── PANEL-4 : Mapping mode → panneaux visibles dans la sidebar ──────────

/**
 * Pour chaque mode de session live, la liste des IDs de panneaux
 * qui doivent être visibles dans la sidebar droite.
 *
 * Les panneaux absents de la liste sont masqués (pas rendus du tout)
 * pour éviter de surcharger l'interface.
 */
export const SESSION_LIVE_PANEL_SETS: Record<SessionLiveMode, GmPanelId[]> = {
  exploration: [
    "combat",
    "encounter-builder",
    "dice-roller",
    "quick-actions",
    "gm-messages",
    "gm-notes",
    "initiative",
    "token-detail",
    "visibility-inspector",
    "session-log",
    "session-stats",
    "dungeon-generator",
    "handouts",
    "bestiary",
    "spellbook",
    "items",
    "homebrew",
    "rules",
    "characters",
    "campaign-info",
    "party-summary",
    "chat",
    "ambiance",
    "npc-generator",
    "scene",
    "tokens",
  ],
  combat: [
    "combat",
    "encounter-builder",
    "dice-roller",
    "quick-actions",
    "gm-messages",
    "initiative",
    "token-detail",
    "visibility-inspector",
    "party-summary",
    "session-log",
    "session-stats",
    "handouts",
    "bestiary",
    "characters",
    "chat",
    "tokens",
  ],
  roleplay: [
    "gm-notes",
    "gm-messages",
    "handouts",
    "visibility-inspector",
    "token-detail",
    "characters",
    "party-summary",
    "session-log",
    "quick-actions",
    "dice-roller",
    "bestiary",
    "spellbook",
    "campaign-info",
    "chat",
    "ambiance",
    "npc-generator",
    "scene",
  ],
  "quick-prep": [
    "combat",
    "encounter-builder",
    "dice-roller",
    "dungeon-generator",
    "handouts",
    "bestiary",
    "spellbook",
    "items",
    "homebrew",
    "rules",
    "gm-messages",
    "quick-actions",
    "characters",
    "campaign-info",
    "chat",
    "npc-generator",
    "scene",
    "tokens",
  ],
  minimal: [
    "combat",
    "token-detail",
    "session-log",
    "quick-actions",
    "gm-messages",
    "initiative",
    "chat",
  ],
};

