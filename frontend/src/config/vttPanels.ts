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
};

export const VTT_PANELS: VttPanelDefinition[] = [
  { id: "minimap", label: "Mini-map", description: "Vue globale de la scène" },
  { id: "token-detail", label: "Détail token", description: "Token sélectionné" },
  { id: "party-summary", label: "Résumé du groupe", description: "PV, CA, vitesse et perception passive" },
  { id: "gm-notes", label: "Notes MJ", description: "Notes privées liées à la scène" },
  { id: "scene", label: "Scène", description: "Créer / configurer une scène" },
  { id: "upload-map", label: "Upload carte", description: "Ajouter une image de carte" },
  { id: "background", label: "Fond de carte", description: "Choisir le fond actif" },
  { id: "token", label: "Ajout token", description: "Placer un nouveau token" },
  { id: "tokens", label: "Liste tokens", description: "Voir les tokens de scène" },
];

export const VTT_PANEL_PRESETS: Array<{ id: FloatingWidgetPreset; label: string; hint: string }> = [
  { id: "exploration", label: "Exploration", hint: "Carte + mini-map + contexte" },
  { id: "combat", label: "Combat", hint: "Tokens + actions rapides" },
  { id: "roleplay", label: "Roleplay", hint: "Contexte, PNJ et notes" },
  { id: "quick-prep", label: "Préparation rapide", hint: "Scènes, cartes et tokens" },
  { id: "minimal", label: "Minimal", hint: "Carte dominante" },
  { id: "preparation", label: "Préparation", hint: "Setup complet MJ" },
  { id: "custom", label: "Personnalisé", hint: "Ton layout sauvegardé" },
];

export function isVttPanelId(value: string): value is VttPanelId {
  return VTT_PANELS.some((panel) => panel.id === value);
}
