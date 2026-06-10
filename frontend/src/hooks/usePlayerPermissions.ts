import { useMemo } from "react";
import type { Campaign } from "../api/types";

export interface PlayerPermissions {
  /** Whether the player can move their own token on the map */
  canMoveToken: boolean;
  /** Reason shown when token movement is disabled */
  canMoveTokenReason: string | null;

  /** Whether HP values are visible to players */
  canSeeHP: boolean;
  /** Reason when HP is hidden */
  canSeeHPReason: string | null;

  /** Whether the player can pan/zoom the map */
  canPanMap: boolean;
  /** Reason when pan is disabled */
  canPanMapReason: string | null;

  /** Whether initiative order is visible */
  canSeeInitiative: boolean;

  /** Fog of war is active */
  fogEnabled: boolean;

  /** Fog auto-reveals around player tokens */
  fogPlayerReveal: boolean;
}

const DEFAULTS: PlayerPermissions = {
  canMoveToken: true,
  canMoveTokenReason: null,
  canSeeHP: true,
  canSeeHPReason: null,
  canPanMap: true,
  canPanMapReason: null,
  canSeeInitiative: false,
  fogEnabled: false,
  fogPlayerReveal: false,
};

/**
 * Reads campaign.gm_settings and returns a permissions object.
 *
 * Each disabled permission includes a human-readable reason string,
 * ready to display as a tooltip or disabled-state indicator.
 */
export function usePlayerPermissions(campaign: Campaign | null): PlayerPermissions {
  return useMemo(() => {
    if (!campaign?.gm_settings) return DEFAULTS;

    const s = campaign.gm_settings;

    const canMoveToken = s.allow_player_token_move !== false;
    const canSeeHP = s.show_player_hp !== false;
    const canPanMap = s.allow_player_map_pan !== false;
    const canSeeInitiative = s.show_initiative_to_players === true;
    const fogEnabled = s.fog_enabled === true;
    const fogPlayerReveal = s.player_fog_reveal === true;

    return {
      canMoveToken,
      canMoveTokenReason: canMoveToken ? null : "Déplacement des tokens désactivé par le MJ",
      canSeeHP,
      canSeeHPReason: canSeeHP ? null : "Points de vie masqués par le MJ",
      canPanMap,
      canPanMapReason: canPanMap ? null : "Navigation de la carte limitée par le MJ",
      canSeeInitiative,
      fogEnabled,
      fogPlayerReveal,
    };
  }, [campaign?.gm_settings]);
}
