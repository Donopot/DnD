/**
 * gmPanels.ts — Registre unique des panneaux GM
 *
 * Source de vérité pour tous les panneaux de l'interface MJ.
 * Remplace l'ancien vttPanels.ts (supprimé en PANEL-1).
 *
 * Convention d'IDs : kebab-case, préfixe contextuel.
 *   - existing:  combat, encounter-builder, dice-roller, quick-actions, gm-messages,
 *                session-log, session-stats, dungeon-generator, handouts, bestiary,
 *                spellbook, items, homebrew, rules, characters, campaign-info,
 *                scene, tokens
 *   - planned:   gm-notes, party-summary, initiative, token-detail,
 *                visibility-inspector, ambiance, chat, npc-generator
 */

// ── Types ────────────────────────────────────────────────────────────────

/** Identifiant unique de panneau (kebab-case). */
export type GmPanelId = string;

/** Catégorie / onglet de rattachement dans la sidebar droite. */
export type GmPanelCategory =
  | "live"
  | "preparation"
  | "journal"
  | "library"
  | "characters"
  | "campaign"
  | "settings";

/** Statut du panneau dans l'implémentation actuelle. */
export type GmPanelStatus = "active" | "planned";

/** Définition complète d'un panneau GM. */
export type GmPanelDefinition = {
  id: GmPanelId;
  label: string;
  emoji: string;
  category: GmPanelCategory;
  description: string;
  status: GmPanelStatus;
  /** Peut être détaché en fenêtre flottante. */
  detachable: boolean;
};

// ── Registre des panneaux ────────────────────────────────────────────────

export const GM_PANELS: GmPanelDefinition[] = [
  // ── Onglet "Session Live" ──────────────────────────────────────────
  {
    id: "combat",
    label: "Combat",
    emoji: "⚔️",
    category: "live",
    description: "Tracker de combat, initiative et conditions",
    status: "active",
    detachable: true,
  },
  {
    id: "conditions",
    label: "États & Conditions",
    emoji: "🏷️",
    category: "live",
    description: "États actifs, durée, rappel de tour, liaison combat",
    status: "active",
    detachable: true,
  },
  {
    id: "encounter-builder",
    label: "Générateur de rencontres",
    emoji: "🧩",
    category: "live",
    description: "Créer et gérer des rencontres",
    status: "active",
    detachable: true,
  },
  {
    id: "active-encounter",
    label: "Rencontre active",
    emoji: "⚔️",
    category: "live",
    description: "Vue d'ensemble du combat : ennemis, objectifs, loot",
    status: "active",
    detachable: true,
  },
  {
    id: "dice-roller",
    label: "Lancer de dés",
    emoji: "🎲",
    category: "live",
    description: "Lancer des dés avec modificateurs",
    status: "active",
    detachable: true,
  },
  {
    id: "quick-actions",
    label: "Actions rapides",
    emoji: "⚡",
    category: "live",
    description: "Raccourcis MJ, dés et macros",
    status: "active",
    detachable: true,
  },
  {
    id: "gm-messages",
    label: "Communication",
    emoji: "💬",
    category: "live",
    description: "Messages MJ vers les joueurs",
    status: "active",
    detachable: true,
  },
  {
    id: "gm-notes",
    label: "Notes MJ",
    emoji: "📝",
    category: "live",
    description: "Notes privées de session par scène",
    status: "active",
    detachable: true,
  },
  {
    id: "initiative",
    label: "Initiative",
    emoji: "⏱️",
    category: "live",
    description: "Ordre de tour et rounds",
    status: "active",
    detachable: true,
  },
  {
    id: "token-detail",
    label: "Détail token",
    emoji: "🔍",
    category: "live",
    description: "Token sélectionné : stats, position",
    status: "active",
    detachable: true,
  },
  {
    id: "visibility-inspector",
    label: "Visibilité",
    emoji: "👁️",
    category: "live",
    description: "Contrôle de ce que voient les joueurs",
    status: "active",
    detachable: true,
  },
  {
    id: "ambiance",
    label: "Ambiance",
    emoji: "🎵",
    category: "live",
    description: "Musique et sons d'ambiance",
    status: "active",
    detachable: true,
  },
  {
    id: "chat",
    label: "Chat en direct",
    emoji: "💭",
    category: "live",
    description: "Chat IC/OOC avec les joueurs",
    status: "active",
    detachable: true,
  },

  // ── Onglet "Préparation" ───────────────────────────────────────────
  {
    id: "dungeon-generator",
    label: "Générateur de donjons",
    emoji: "🗺️",
    category: "preparation",
    description: "Générer des cartes de donjon",
    status: "active",
    detachable: true,
  },
  {
    id: "handouts",
    label: "Documents",
    emoji: "📄",
    category: "preparation",
    description: "Handouts, notes et révélations",
    status: "active",
    detachable: true,
  },
  {
    id: "scene",
    label: "Scènes",
    emoji: "🎬",
    category: "preparation",
    description: "Créer et gérer les scènes",
    status: "active",
    detachable: true,
  },
  {
    id: "tokens",
    label: "Tokens",
    emoji: "🎭",
    category: "preparation",
    description: "Ajouter et gérer les tokens de scène",
    status: "active",
    detachable: true,
  },
  {
    id: "token-library",
    label: "Bibliothèque tokens",
    emoji: "🗂️",
    category: "preparation",
    description: "Templates de tokens réutilisables, favoris, ajout rapide",
    status: "active",
    detachable: true,
  },

  // ── Onglet "Journal" ───────────────────────────────────────────────
  {
    id: "session-log",
    label: "Journal",
    emoji: "📋",
    category: "journal",
    description: "Archive complète de session",
    status: "active",
    detachable: true,
  },
  {
    id: "session-stats",
    label: "Statistiques",
    emoji: "📊",
    category: "journal",
    description: "Stats de campagne et résumés",
    status: "active",
    detachable: true,
  },

  // ── Onglet "Bibliothèque" ──────────────────────────────────────────
  {
    id: "bestiary",
    label: "Bestiaire",
    emoji: "💀",
    category: "library",
    description: "Statblocks de monstres",
    status: "active",
    detachable: true,
  },
  {
    id: "spellbook",
    label: "Grimoire",
    emoji: "✨",
    category: "library",
    description: "Recherche de sorts",
    status: "active",
    detachable: true,
  },
  {
    id: "items",
    label: "Équipement",
    emoji: "🎒",
    category: "library",
    description: "Compendium d'objets et équipement",
    status: "active",
    detachable: true,
  },
  {
    id: "homebrew",
    label: "Bibliothèque",
    emoji: "📚",
    category: "library",
    description: "Contenu homebrew et règles maison",
    status: "active",
    detachable: true,
  },
  {
    id: "rules",
    label: "Règles (SRD)",
    emoji: "📖",
    category: "library",
    description: "Référence rapide des règles",
    status: "active",
    detachable: true,
  },
  {
    id: "npc-generator",
    label: "Générateur PNJ",
    emoji: "🧑",
    category: "library",
    description: "Créer des PNJ aléatoires",
    status: "active",
    detachable: true,
  },

  // ── Onglet "Personnages" ───────────────────────────────────────────
  {
    id: "characters",
    label: "Personnages",
    emoji: "👤",
    category: "characters",
    description: "Fiches personnages et résumé du groupe",
    status: "active",
    detachable: false,
  },
  {
    id: "party-summary",
    label: "Résumé du groupe",
    emoji: "📊",
    category: "characters",
    description: "PV, CA, vitesse, perception passive",
    status: "active",
    detachable: true,
  },

  // ── Onglet "Campagne" ──────────────────────────────────────────────
  {
    id: "campaign-info",
    label: "Infos campagne",
    emoji: "📋",
    category: "campaign",
    description: "Description, membres et invitations",
    status: "active",
    detachable: false,
  },

  // ── Onglet "Paramètres" ────────────────────────────────────────────
  {
    id: "settings-placeholder",
    label: "Paramètres",
    emoji: "⚙️",
    category: "settings",
    description: "Permissions, layouts et options (à venir)",
    status: "active",
    detachable: false,
  },
];

// ── Helpers ─────────────────────────────────────────────────────────────

/** Vérifie si une chaîne est un ID de panneau valide. */
export function isGmPanelId(value: string): value is GmPanelId {
  return GM_PANELS.some((p) => p.id === value);
}

/** Retourne le label d'un panneau à partir de son ID. */
export function getGmPanelLabel(panelId: string): string {
  return GM_PANELS.find((p) => p.id === panelId)?.label ?? panelId;
}

/** Retourne tous les panneaux détachables. */
export function getDetachablePanels(): GmPanelDefinition[] {
  return GM_PANELS.filter((p) => p.detachable);
}
