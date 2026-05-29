export type FloatingWidgetPreset =
  | "exploration"
  | "combat"
  | "roleplay"
  | "quick-prep"
  | "minimal"
  | "preparation"
  | "custom";

export type VttPanelId =
  | "minimap"
  | "token-detail"
  | "visibility-inspector"
  | "quick-actions"
  | "initiative"
  | "party-summary"
  | "gm-notes"
  | "scene"
  | "upload-map"
  | "background"
  | "token"
  | "tokens";

export type VttPanelDefinition = {
  id: VttPanelId;
  label: string;
  description: string;
  category: "session" | "map" | "combat" | "preparation" | "system";
};

export const VTT_PANELS: VttPanelDefinition[] = [
  {
    id: "minimap",
    label: "Mini-map",
    description: "Vue globale de la scène",
    category: "map",
  },
  {
    id: "token-detail",
    label: "Détail token",
    description: "Token sélectionné",
    category: "session",
  },
  {
    id: "visibility-inspector",
    label: "Visibilité",
    description: "Contrôle de ce que voient les joueurs",
    category: "session",
  },
  {
    id: "quick-actions",
    label: "Actions rapides",
    description: "Raccourcis MJ, dés et layouts",
    category: "session",
  },
  {
    id: "initiative",
    label: "Initiative",
    description: "Ordre de tour et rounds",
    category: "combat",
  },
  {
    id: "party-summary",
    label: "Résumé du groupe",
    description: "PV, CA, vitesse et perception passive",
    category: "session",
  },
  {
    id: "gm-notes",
    label: "Notes MJ",
    description: "Notes privées de scène",
    category: "session",
  },
  {
    id: "scene",
    label: "Scènes",
    description: "Créer / configurer une scène",
    category: "preparation",
  },
  {
    id: "upload-map",
    label: "Upload carte",
    description: "Ajouter une image de carte",
    category: "preparation",
  },
  {
    id: "background",
    label: "Fond de carte",
    description: "Choisir le fond actif",
    category: "preparation",
  },
  {
    id: "token",
    label: "Ajout token",
    description: "Placer un nouveau token",
    category: "preparation",
  },
  {
    id: "tokens",
    label: "Liste tokens",
    description: "Voir les tokens de scène",
    category: "session",
  },
];

export const VTT_PANEL_PRESETS: Array<{ id: FloatingWidgetPreset; label: string; hint: string }> = [
  { id: "exploration", label: "Exploration", hint: "Carte + contexte + notes" },
  { id: "combat", label: "Combat", hint: "Initiative + token + actions" },
  { id: "roleplay", label: "Roleplay", hint: "Notes, visibilité et contexte" },
  { id: "quick-prep", label: "Préparation rapide", hint: "Scènes, cartes et tokens" },
  { id: "minimal", label: "Minimal", hint: "Carte dominante" },
  { id: "preparation", label: "Préparation", hint: "Setup complet MJ" },
  { id: "custom", label: "Personnalisé", hint: "Ton layout sauvegardé" },
];

export function isVttPanelId(value: string): value is VttPanelId {
  return VTT_PANELS.some((panel) => panel.id === value);
}

export function getVttPanelLabel(panelId: string) {
  return VTT_PANELS.find((panel) => panel.id === panelId)?.label ?? panelId;
}
