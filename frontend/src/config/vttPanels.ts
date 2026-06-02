/**
 * @deprecated Utiliser gmPanels.ts — ce fichier est un wrapper de compatibilité.
 * Sera supprimé en PANEL-5.
 */

import type { SessionLiveMode } from "./sessionLiveModes";

export {
  type GmPanelId as VttPanelId,
  type GmPanelCategory as VttPanelCategory,
  type GmPanelDefinition as VttPanelDefinition,
  GM_PANELS as VTT_PANELS,
  isGmPanelId as isVttPanelId,
  getGmPanelLabel as getVttPanelLabel,
} from "./gmPanels";

/**
 * @deprecated Utiliser SessionLiveMode depuis gmPanels.ts.
 * Inclut "preparation" et "custom" pour compatibilité avec useFloatingWidgets (legacy).
 */
export type FloatingWidgetPreset = SessionLiveMode | "preparation" | "custom";
