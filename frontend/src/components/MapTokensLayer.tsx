import type { PointerEvent } from "react";
import type { SceneToken } from "../api/types";
import type { MapPermissions } from "./CampaignMap";
import type { FogZone } from "./FogLayer";

const CONDITION_EMOJI: Record<string, string> = {
  blinded: "👁️‍🗨️",
  charmed: "💫",
  deafened: "🔇",
  frightened: "😱",
  grappled: "🤝",
  incapacitated: "💤",
  invisible: "👻",
  paralyzed: "🧊",
  petrified: "🪨",
  poisoned: "☠️",
  prone: "⬇️",
  restrained: "⛓️",
  stunned: "⚡",
  unconscious: "💀",
  concentrating: "🔮",
  exhausted: "😩",
  bloodied: "🩸",
  hidden: "🙈",
  dodging: "🏃",
  readied: "⏳",
};

export type MapTokensLayerProps = {
  sceneTokens: SceneToken[];
  gridSize: number;
  isGM: boolean;
  fogZones: FogZone[];
  isInFogZone: (px: number, py: number, zone: FogZone) => boolean;
  selectedTokenId: string;
  selectedTokenIds: Set<string>;
  dragTokenId: string;
  previewPositions: Record<string, { x: number; y: number }>;
  zoom: number;
  permissions: MapPermissions;
  ownedByPlayer: (tokenId: string) => boolean;
  selectToken: (tokenId: string) => void;
  setSelectedTokenIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  onTokenPointerDown: (e: PointerEvent, token: SceneToken) => void;
  boardRef: React.RefObject<HTMLDivElement | null>;
  onContextMenu: (token: SceneToken, x: number, y: number) => void;
};

export function MapTokensLayer({
  sceneTokens,
  gridSize,
  isGM,
  fogZones,
  isInFogZone,
  selectedTokenId,
  selectedTokenIds,
  dragTokenId,
  previewPositions,
  zoom,
  permissions,
  ownedByPlayer,
  selectToken,
  setSelectedTokenIds,
  onTokenPointerDown,
  boardRef,
  onContextMenu,
}: MapTokensLayerProps) {
  return (
    <>
      {sceneTokens.map((token) => {
        const hpPercent = token.metadata?.hp_max
          ? Math.round(
              (((token.metadata?.hp_current as number) ?? 0) / (token.metadata.hp_max as number)) *
                100,
            )
          : null;

        const isPlayerToken = ownedByPlayer(token.id);
        const isManuallyHidden = token.is_hidden;

        // ── is_hidden filter (players MUST NOT see hidden tokens) ──
        if (!isGM && isManuallyHidden) {
          return null;
        }

        // ── Fog visibility filter (players only) ──────────
        if (!isGM && fogZones.length > 0) {
          const tokenCenterX = token.x + (token.size * gridSize) / 2;
          const tokenCenterY = token.y + (token.size * gridSize) / 2;
          const isRevealed = fogZones.some((zone) => isInFogZone(tokenCenterX, tokenCenterY, zone));
          if (!isRevealed) return null;
        }

        // ── GM fog indicator: token is hidden from players
        let isFogHidden = false;
        if (isGM && fogZones.length > 0 && !isManuallyHidden) {
          const tokenCenterX = token.x + (token.size * gridSize) / 2;
          const tokenCenterY = token.y + (token.size * gridSize) / 2;
          isFogHidden = !fogZones.some((zone) => isInFogZone(tokenCenterX, tokenCenterY, zone));
        }

        const isBloodied = hpPercent !== null && hpPercent <= 50 && hpPercent > 0;
        const isDefeated = hpPercent !== null && hpPercent <= 0;
        const isConcentrating =
          (token.metadata as Record<string, unknown> | null)?.conditions &&
          Array.isArray((token.metadata as Record<string, unknown>)?.conditions) &&
          ((token.metadata as Record<string, unknown>)?.conditions as string[]).includes(
            "concentrating",
          );

        const conditions: string[] =
          (token.metadata as Record<string, unknown> | null)?.conditions &&
          Array.isArray((token.metadata as Record<string, unknown>)?.conditions)
            ? ((token.metadata as Record<string, unknown>)?.conditions as string[])
            : [];

        return (
          <div
            className={`campaign-map-token ${selectedTokenId === token.id ? "selected" : ""} ${selectedTokenIds.has(token.id) && selectedTokenId !== token.id ? "group-selected" : ""} ${dragTokenId === token.id ? "dragging" : ""} ${isPlayerToken && isGM ? "player-owned" : ""} ${isBloodied ? "token-bloodied" : ""} ${isDefeated ? "token-defeated" : ""} ${isConcentrating ? "token-concentrating" : ""} ${isFogHidden ? "fog-hidden" : ""} ${isManuallyHidden ? "token-hidden-from-players" : ""}`}
            key={token.id}
            data-token-id={token.id}
            role="button"
            tabIndex={0}
            aria-label={`Token ${token.name}, position (${token.x}, ${token.y})${selectedTokenId === token.id ? " — sélectionné" : ""}${selectedTokenIds.has(token.id) && selectedTokenId !== token.id ? " — groupe" : ""}`}
            onClick={() => {
              if (!permissions.canSelectToken(token.id)) return;
              selectToken(token.id);
              setSelectedTokenIds(new Set([token.id]));
            }}
            onKeyDown={(e) => {
              if ((e.key === "Enter" || e.key === " ") && permissions.canSelectToken(token.id)) {
                e.preventDefault();
                if (e.shiftKey) {
                  setSelectedTokenIds((prev) => {
                    const next = new Set(prev);
                    if (next.has(token.id)) {
                      next.delete(token.id);
                    } else {
                      next.add(token.id);
                      selectToken(token.id);
                    }
                    return next;
                  });
                } else {
                  selectToken(token.id);
                  setSelectedTokenIds(new Set([token.id]));
                }
              }
            }}
            onPointerDown={(e) => onTokenPointerDown(e, token)}
            onContextMenu={(e) => {
              e.preventDefault();
              e.stopPropagation();
              const rect = boardRef.current?.getBoundingClientRect();
              if (!rect) return;
              onContextMenu(token, (e.clientX - rect.left) / zoom, (e.clientY - rect.top) / zoom);
            }}
            style={{
              left: previewPositions[token.id]?.x ?? token.x,
              top: previewPositions[token.id]?.y ?? token.y,
              width: token.size * gridSize,
              height: token.size * gridSize,
              background: token.color,
              zIndex: 30 + (token.z_index ?? 0),
            }}
          >
            {/* Token icon (first 2 letters) */}
            <span className="token-icon">{token.name.slice(0, 2).toUpperCase()}</span>

            {/* Fog-hidden indicator (GM only) */}
            {isFogHidden && !isManuallyHidden && (
              <span className="token-fog-icon" title="Caché par le brouillard">
                👁️‍🗨️
              </span>
            )}

            {/* Manually hidden indicator (GM only) */}
            {isManuallyHidden && (
              <span className="token-visibility-icon" title="Caché manuellement aux joueurs">
                🙈
              </span>
            )}

            {/* Token nameplate */}
            <span className="token-nameplate">{token.name}</span>

            {/* Health bar */}
            {hpPercent !== null && (
              <div className="token-hp-bar">
                <span
                  className="token-hp-fill"
                  style={{ width: `${Math.max(0, Math.min(100, hpPercent))}%` }}
                />
              </div>
            )}

            {/* Condition badges */}
            {conditions.length > 0 && (
              <div className="token-conditions">
                {conditions.slice(0, 4).map((c) => (
                  <span key={c} className="token-condition-badge" title={c}>
                    {CONDITION_EMOJI[c] || "❓"}
                  </span>
                ))}
                {conditions.length > 4 && (
                  <span className="token-condition-badge token-condition-more">
                    +{conditions.length - 4}
                  </span>
                )}
              </div>
            )}

            {/* Selection ring */}
            {(selectedTokenId === token.id || selectedTokenIds.has(token.id)) && (
              <div
                className={`token-ring${selectedTokenIds.has(token.id) && selectedTokenId !== token.id ? " token-ring-group" : ""}`}
              />
            )}
          </div>
        );
      })}
    </>
  );
}
