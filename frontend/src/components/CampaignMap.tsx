import { type PointerEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Scene, SceneToken } from "../api/types";
import { useFogOfWar } from "../hooks/useFogOfWar";
import { useGlobalKeyboard } from "../hooks/useGlobalKeyboard";

export type MapPermissions = {
  canSelectToken: (tokenId: string) => boolean;
  canMoveToken: (tokenId: string) => boolean;
  canEditFog: boolean;
  canMultiSelect: boolean;
};

import { useNudgeSelectedToken } from "../hooks/useKeyboard";
import { useMapViewport } from "../hooks/useMapViewport";
import { FogLayer } from "./FogLayer";
import { MapMinimap } from "./MapMinimap";
import { MapTokensLayer } from "./MapTokensLayer";
import { MapToolbar } from "./MapToolbar";
import { MapTools } from "./MapTools";
import { TokenContextMenu } from "./TokenContextMenu";
import { WeatherLayer, type WeatherType } from "./WeatherLayer";

// ─── Types ────────────────────────────────────────────────────────────────

type TokenDragHandler = (token: SceneToken, dx: number, dy: number) => void;
type TokenActionHandler = (
  action:
    | "center"
    | "duplicate"
    | "delete"
    | "hide"
    | "reveal"
    | "lock"
    | "unlock"
    | "add-combat"
    | "front"
    | "back"
    | "damage"
    | "heal",
  token: SceneToken,
  value?: number,
) => void;
type TokenBatchActionHandler = (
  action: "duplicate" | "delete" | "hide" | "reveal" | "front" | "back",
  tokens: SceneToken[],
  value?: number,
) => void;

export type CampaignMapProps = {
  campaignId: string;
  token: string;
  scenes: Scene[];
  selectedScene: Scene | undefined;
  selectedSceneId: string;
  sceneTokens: SceneToken[];
  sceneBackgroundObjectUrl: string;
  /** Interaction permissions — parent computes based on role + ownership */
  permissions: MapPermissions;
  /** Token IDs belonging to players (cosmetic indicator for GM) */
  playerTokenIds?: Set<string>;
  isGM: boolean;
  wsRef: React.RefObject<WebSocket | null>;
  /** Fog version counter — incremented by parent on fog WS change, triggers reload */
  fogVersion?: number;
  onSelectScene?: (sceneId: string) => void;
  selectedTokenId?: string;
  onSelectToken?: (tokenId: string) => void;
  onLoadSceneTokens?: (sceneId: string) => void;
  /** Show the minimap overlay. Defaults to true (always visible), set to false to hide. */
  showMiniMap?: boolean;
  onMoveToken?: TokenDragHandler;
  onTokenAction?: TokenActionHandler;
  onTokenBatchAction?: TokenBatchActionHandler;
};

// ─── Constants ────────────────────────────────────────────────────────────

const PAN_SPEED = 1.5;

// ─── Component ────────────────────────────────────────────────────────────

export function CampaignMap({
  campaignId,
  token: _authToken,
  scenes,
  selectedScene,
  selectedSceneId,
  sceneTokens,
  sceneBackgroundObjectUrl,
  permissions,
  playerTokenIds,
  isGM,
  wsRef,
  fogVersion,
  onSelectScene,
  onLoadSceneTokens,
  onMoveToken,
  onTokenAction,
  onTokenBatchAction,
  selectedTokenId: controlledSelectedTokenId,
  onSelectToken,
  showMiniMap,
}: CampaignMapProps) {
  const boardRef = useRef<HTMLDivElement>(null);

  const { scrollRef, zoom, zoomIn, zoomOut, recenter, setViewportState } = useMapViewport({
    sceneWidth: selectedScene?.width ?? 2800,
    sceneHeight: selectedScene?.height ?? 2100,
    sceneId: selectedSceneId,
  });

  const [panMode, setPanMode] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const [panOrigin, setPanOrigin] = useState({ x: 0, y: 0 });
  const [dragState, setDragState] = useState<{
    tokenIds: string[];
    startX: number;
    startY: number;
    origins: Record<string, { x: number; y: number }>;
  } | null>(null);
  const [previewPositions, setPreviewPositions] = useState<
    Record<string, { x: number; y: number }>
  >({});
  const [localSelectedTokenId, setLocalSelectedTokenId] = useState("");
  const [selectedTokenIds, setSelectedTokenIds] = useState<Set<string>>(new Set());
  const [showGrid, setShowGrid] = useState(true);
  const [sceneTransitioning, setSceneTransitioning] = useState(false);
  const [weather, _setWeather] = useState<WeatherType>("clear");
  const [weatherIntensity, _setWeatherIntensity] = useState(50);
  const [weatherEnabled, _setWeatherEnabled] = useState(false);

  // ── Fog of War (extracted hook) ──────────────────────────
  const {
    fogZones,
    showFog,
    setShowFog,
    fogDrawMode,
    setFogDrawMode,
    fogCircleMode,
    setFogCircleMode,
    fogEraseMode,
    setFogEraseMode,
    fogDrawing,
    setFogDrawing,
    fogStart,
    setFogStart,
    fogCurrentRect,
    setFogCurrentRect,
    fogSaveError,
    setFogSaveError,
    saveFogZones,
    isInFogZone,
  } = useFogOfWar({ selectedSceneId, wsRef });

  // Context menu state
  const [contextMenu, setContextMenu] = useState<{
    token: SceneToken;
    x: number;
    y: number;
  } | null>(null);

  const selectedTokenId = controlledSelectedTokenId ?? localSelectedTokenId;
  const dragTokenId = dragState?.tokenIds[0] ?? "";

  function selectToken(tokenId: string) {
    setLocalSelectedTokenId(tokenId);
    onSelectToken?.(tokenId);
  }

  useEffect(() => {
    if (controlledSelectedTokenId === undefined) return;
    setSelectedTokenIds(
      controlledSelectedTokenId ? new Set([controlledSelectedTokenId]) : new Set(),
    );
  }, [controlledSelectedTokenId]);

  useEffect(() => {
    const tokenIds = new Set(sceneTokens.map((token) => token.id));

    if (selectedTokenId && !tokenIds.has(selectedTokenId)) {
      selectToken("");
    }

    setSelectedTokenIds((current) => {
      const next = new Set([...current].filter((id) => tokenIds.has(id)));
      return next.size === current.size ? current : next;
    });

    if (contextMenu && !tokenIds.has(contextMenu.token.id)) {
      setContextMenu(null);
    }
  }, [sceneTokens, selectedTokenId, contextMenu]);

  // Scene transition animation (viewport centering handled by useMapViewport)
  useEffect(() => {
    setSceneTransitioning(true);
    const timer = setTimeout(() => setSceneTransitioning(false), 300);
    return () => clearTimeout(timer);
  }, [selectedSceneId]);

  // ── Fog zone save with rollback on failure ────────────────────────────────

  const zoomPercent = Math.round(zoom * 100);
  const gridSize = selectedScene?.grid_size ?? 50;

  // playerTokenIds only used for cosmetic indicator (GM sees player-owned tokens)
  const ownedByPlayer = (tokenId: string) => playerTokenIds?.has(tokenId) ?? false;

  // ── Keyboard nudge for selected tokens (grid-aware) ─────────
  const selectedToken = useMemo(
    () => sceneTokens.find((t) => t.id === selectedTokenId),
    [sceneTokens, selectedTokenId],
  );
  const selectedTokens = useMemo(
    () => sceneTokens.filter((t) => selectedTokenIds.has(t.id)),
    [sceneTokens, selectedTokenIds],
  );

  useNudgeSelectedToken(
    selectedTokenId !== "" || selectedTokenIds.size > 0,
    (dx, dy) => {
      if (!onMoveToken) return;
      // Move all multi-selected tokens
      for (const t of selectedTokens) {
        if (!permissions.canMoveToken(t.id)) continue;
        onMoveToken(t, dx, dy);
      }
      // Also move the primary selected token if not already in the multi-set
      if (
        selectedToken &&
        !selectedTokenIds.has(selectedToken.id) &&
        permissions.canMoveToken(selectedToken.id)
      ) {
        onMoveToken(selectedToken, dx, dy);
      }
    },
    {
      gridSize,
      enabled:
        Boolean(onMoveToken) &&
        (selectedTokens.some((token) => permissions.canMoveToken(token.id)) ||
          Boolean(selectedToken && permissions.canMoveToken(selectedToken.id))),
    },
  );

  // ── Zoom (toward cursor) ────────────────────────────────────────────────

  function handleWheel(event: WheelEvent) {
    event.preventDefault();
    const rect = scrollRef.current?.getBoundingClientRect();
    if (!rect) return;
    const cursorX = event.clientX - rect.left;
    const cursorY = event.clientY - rect.top;
    if (event.deltaY < 0) {
      zoomIn(cursorX, cursorY);
    } else {
      zoomOut(cursorX, cursorY);
    }
  }

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleWheel);
  }, [handleWheel]);

  // ── Keyboard shortcuts ───────────────────────────────────────────────────
  // ── Keyboard Shortcuts ────────────────────────────────────────────────────

  useGlobalKeyboard(
    useCallback(
      (e: KeyboardEvent) => {
        // Don't capture when typing in an input
        const tag = (e.target as HTMLElement).tagName;
        if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

        // ── Token-specific shortcuts (only when a token is selected) ──
        if (onTokenAction && sceneTokens && (selectedTokenId || selectedTokenIds.size > 0)) {
          // Determine targets: multi-select set or single primary token
          const targets: SceneToken[] = [];
          if (selectedTokenIds.size > 1) {
            for (const t of sceneTokens) {
              if (selectedTokenIds.has(t.id)) targets.push(t);
            }
          } else {
            const token = sceneTokens.find((t) => t.id === selectedTokenId);
            if (token) targets.push(token);
          }
          if (targets.length === 0) {
            /* fall through to general shortcuts below */
          } else {
            const isMulti = targets.length > 1;

            switch (e.key) {
              case "Delete":
              case "Backspace":
                e.preventDefault();
                if (isMulti && onTokenBatchAction) {
                  onTokenBatchAction("delete", targets);
                } else {
                  onTokenAction("delete", targets[0]);
                }
                // Clean up selection state to avoid phantom tokens
                if (isMulti) {
                  setSelectedTokenIds(new Set());
                  selectToken("");
                }
                return;
            }

            if (e.ctrlKey || e.metaKey) {
              switch (e.key) {
                case "d":
                case "D":
                  e.preventDefault();
                  if (isMulti && onTokenBatchAction) {
                    onTokenBatchAction("duplicate", targets);
                  } else {
                    onTokenAction("duplicate", targets[0]);
                  }
                  return;
                case "h":
                case "H": {
                  e.preventDefault();
                  // If any selected token is visible → hide all, otherwise reveal all
                  const shouldHide = targets.some((t) => !t.is_hidden);
                  const toggleAction = shouldHide ? "hide" : "reveal";
                  if (isMulti && onTokenBatchAction) {
                    onTokenBatchAction(toggleAction, targets);
                  } else {
                    onTokenAction(toggleAction, targets[0]);
                  }
                  return;
                }
              }
            }

            switch (e.key) {
              case "]":
                e.preventDefault();
                if (isMulti && onTokenBatchAction) {
                  onTokenBatchAction("front", targets);
                } else {
                  onTokenAction("front", targets[0]);
                }
                return;
              case "[":
                e.preventDefault();
                if (isMulti && onTokenBatchAction) {
                  onTokenBatchAction("back", targets);
                } else {
                  onTokenAction("back", targets[0]);
                }
                return;
            }
          }
        }

        switch (e.key) {
          case " ":
            e.preventDefault();
            setPanMode((p) => !p);
            break;
          case "g":
          case "G":
            setShowGrid((g) => !g);
            break;
          case "f":
          case "F":
            // Dispatch focus-map toggle via custom event (handled by parent App)
            window.dispatchEvent(new CustomEvent("toggle-focus-map"));
            break;
          case "0":
            recenter();
            break;
          case "z":
          case "Z":
            if (e.ctrlKey || e.metaKey) {
              e.preventDefault();
              window.dispatchEvent(new CustomEvent("undo-token-move"));
            }
            break;
          case "Escape":
            selectToken("");
            setSelectedTokenIds(new Set());
            break;
        }
      },
      [selectedScene, selectedTokenId, selectedTokenIds, sceneTokens, onTokenAction],
    ),
    [selectedScene, selectedTokenId, selectedTokenIds, sceneTokens, onTokenAction],
  );

  // ── Pan ─────────────────────────────────────────────────────────────────

  function handlePanPointerDown(event: PointerEvent) {
    // Middle button (button=1) always triggers pan regardless of panMode/GM
    const isMiddleButton = event.button === 1;
    if (event.button !== 0 && !isMiddleButton) return;
    if (!isMiddleButton && isGM && !panMode) return;
    if (isMiddleButton) event.preventDefault();
    setIsPanning(true);
    setPanOrigin({ x: event.clientX, y: event.clientY });
    (event.target as HTMLElement).setPointerCapture(event.pointerId);
  }

  function handlePanPointerMove(event: PointerEvent) {
    if (!isPanning) return;
    const dx = (event.clientX - panOrigin.x) * PAN_SPEED;
    const dy = (event.clientY - panOrigin.y) * PAN_SPEED;
    if (scrollRef.current) {
      scrollRef.current.scrollLeft -= dx;
      scrollRef.current.scrollTop -= dy;
    }
    setPanOrigin({ x: event.clientX, y: event.clientY });
  }

  function handlePanPointerUp() {
    setIsPanning(false);
    // Persist final scroll position after pan
    const el = scrollRef.current;
    if (el) {
      setViewportState({ scrollLeft: el.scrollLeft, scrollTop: el.scrollTop });
    }
  }

  // ── Token interaction (GM only, snap-to-grid) ───────────────────────────

  const snapToGrid = useCallback(
    (value: number) => Math.round(value / gridSize) * gridSize,
    [gridSize],
  );

  // ── Token interaction (GM only, snap-to-grid) ───────────────────────────
  function handleTokenPointerDown(event: PointerEvent, token: SceneToken) {
    if (event.button === 1) {
      return;
    }

    if (event.button !== 0) {
      return;
    }

    event.stopPropagation();

    // Shift+click = toggle multi-select without starting drag
    if (event.shiftKey && permissions.canMultiSelect) {
      setSelectedTokenIds((prev) => {
        const next = new Set(prev);
        if (next.has(token.id)) {
          next.delete(token.id);
          // If we removed the primary, pick a new primary
          if (selectedTokenId === token.id) {
            const remaining = [...next];
            selectToken(remaining[0] ?? "");
          }
        } else {
          next.add(token.id);
          selectToken(token.id); // Last added = primary
        }
        return next;
      });
      return;
    }

    // Plain click = single select + drag
    const canMoveToken = permissions.canMoveToken(token.id);
    const tokenIds =
      permissions.canMultiSelect && selectedTokenIds.has(token.id) && selectedTokenIds.size > 0
        ? [...selectedTokenIds]
        : [token.id];

    selectToken(token.id);
    setSelectedTokenIds(new Set(tokenIds));

    if (!canMoveToken || !onMoveToken) return;

    const rect = boardRef.current?.getBoundingClientRect();
    if (!rect) return;
    const startX = (event.clientX - rect.left) / zoom;
    const startY = (event.clientY - rect.top) / zoom;
    const origins: Record<string, { x: number; y: number }> = {};
    for (const id of tokenIds) {
      const sceneToken = sceneTokens.find((item) => item.id === id);
      if (sceneToken && permissions.canMoveToken(sceneToken.id)) {
        origins[id] = { x: sceneToken.x, y: sceneToken.y };
      }
    }

    if (Object.keys(origins).length === 0) return;
    setDragState({ tokenIds: Object.keys(origins), startX, startY, origins });
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
  }

  function handleBoardPointerMove(event: PointerEvent) {
    if (!dragState || !gridSize) return;
    const rect = boardRef.current?.getBoundingClientRect();
    if (!rect) return;
    const currentX = (event.clientX - rect.left) / zoom;
    const currentY = (event.clientY - rect.top) / zoom;
    // Smooth preview — no snap during drag (snap applied on release)
    const dx = currentX - dragState.startX;
    const dy = currentY - dragState.startY;

    setPreviewPositions(() => {
      const next: Record<string, { x: number; y: number }> = {};
      for (const tokenId of dragState.tokenIds) {
        const origin = dragState.origins[tokenId];
        if (origin) {
          next[tokenId] = {
            x: Math.max(0, origin.x + dx),
            y: Math.max(0, origin.y + dy),
          };
        }
      }
      return next;
    });
  }

  function handleBoardPointerUp() {
    if (dragState && onMoveToken) {
      for (const tokenId of dragState.tokenIds) {
        const origin = dragState.origins[tokenId];
        const preview = previewPositions[tokenId];
        const token = sceneTokens.find((item) => item.id === tokenId);
        if (!origin || !preview || !token) continue;
        // Snap final delta to grid before API call
        const dx = snapToGrid(preview.x - origin.x);
        const dy = snapToGrid(preview.y - origin.y);
        if (dx !== 0 || dy !== 0) {
          onMoveToken(token, dx, dy);
        }
      }
    }
    setDragState(null);
    setPreviewPositions({});
  }

  // ── Render ──────────────────────────────────────────────────────────────

  if (!selectedScene) {
    return (
      <div className="campaign-map-empty">
        {scenes.length === 0 ? (
          <p className="muted">Aucune scène disponible.</p>
        ) : (
          <p className="muted">Sélectionne une scène.</p>
        )}
      </div>
    );
  }

  return (
    <div className="campaign-map-shell">
      {/* ── Toolbar ──────────────────────────────────────────── */}
      <MapToolbar
        scenes={scenes}
        selectedSceneId={selectedSceneId}
        onSelectScene={onSelectScene}
        onLoadSceneTokens={onLoadSceneTokens}
        zoomPercent={zoomPercent}
        zoomIn={zoomIn}
        zoomOut={zoomOut}
        scrollRef={scrollRef}
        showGrid={showGrid}
        setShowGrid={setShowGrid}
        recenter={recenter}
        panMode={panMode}
        setPanMode={setPanMode}
        setFogDrawMode={setFogDrawMode}
        setFogEraseMode={setFogEraseMode}
        setFogDrawing={setFogDrawing}
        setFogCurrentRect={setFogCurrentRect}
        isGM={isGM}
        showFog={showFog}
        setShowFog={setShowFog}
        fogDrawMode={fogDrawMode}
        fogCircleMode={fogCircleMode}
        setFogCircleMode={setFogCircleMode}
        fogEraseMode={fogEraseMode}
        fogZones={fogZones}
        saveFogZones={saveFogZones}
        selectedSceneName={selectedScene.name}
      />

      {/* ── Map viewport ─────────────────────────────────────── */}
      <div
        ref={scrollRef}
        className={`campaign-map-viewport ${panMode ? "pan-mode" : ""} ${isPanning ? "panning" : ""}`}
        onPointerDown={handlePanPointerDown}
        onPointerMove={handlePanPointerMove}
        onPointerUp={handlePanPointerUp}
        onPointerCancel={handlePanPointerUp}
        onAuxClick={(e) => {
          if (e.button === 1) {
            e.preventDefault();
            setPanMode((p) => !p);
          }
        }}
      >
        <div
          className="campaign-map-surface"
          style={{
            width: selectedScene.width * zoom,
            height: selectedScene.height * zoom,
          }}
        >
          <div
            ref={boardRef}
            className={`campaign-map-board ${sceneBackgroundObjectUrl ? "with-background" : ""} ${dragTokenId ? "is-dragging" : ""} ${showGrid ? "show-grid" : ""} ${sceneTransitioning ? "scene-transitioning" : ""}`}
            onPointerMove={dragState ? handleBoardPointerMove : undefined}
            onPointerUp={dragState ? handleBoardPointerUp : undefined}
            onPointerCancel={
              dragState
                ? () => {
                    setDragState(null);
                    setPreviewPositions({});
                  }
                : undefined
            }
            onClick={(e) => {
              // Click on empty board space deselects all tokens
              if (e.target === boardRef.current) {
                selectToken("");
                setSelectedTokenIds(new Set());
              }
            }}
            style={{
              width: selectedScene.width,
              height: selectedScene.height,
              backgroundSize: `${gridSize}px ${gridSize}px`,
              transform: `scale(${zoom})`,
            }}
          >
            {/* Background image */}
            {sceneBackgroundObjectUrl && (
              <img
                alt=""
                aria-hidden="true"
                className="campaign-map-bg"
                src={sceneBackgroundObjectUrl}
              />
            )}

            {/* Fog of War */}
            <FogLayer
              sceneId={selectedScene.id}
              sceneWidth={selectedScene.width}
              sceneHeight={selectedScene.height}
              isGM={isGM}
              canEditFog={permissions.canEditFog}
              zoom={zoom}
              panMode={panMode}
              fogZones={fogZones}
              onZonesChange={saveFogZones}
              showFog={showFog}
              drawMode={fogDrawMode}
              circleMode={fogCircleMode}
              eraseMode={fogEraseMode}
              drawing={fogDrawing}
              setDrawing={setFogDrawing}
              start={fogStart}
              setStart={setFogStart}
              currentRect={fogCurrentRect}
              setCurrentRect={setFogCurrentRect}
              saveError={fogSaveError}
              setSaveError={setFogSaveError}
            />

            {/* Weather effects */}
            {selectedScene && (
              <WeatherLayer
                type={weather}
                intensity={weatherIntensity}
                width={selectedScene.width}
                height={selectedScene.height}
                enabled={weatherEnabled}
              />
            )}

            {/* Tokens */}
            <MapTokensLayer
              sceneTokens={sceneTokens}
              gridSize={gridSize}
              isGM={isGM}
              fogZones={fogZones}
              isInFogZone={isInFogZone}
              selectedTokenId={selectedTokenId}
              selectedTokenIds={selectedTokenIds}
              dragTokenId={dragTokenId}
              previewPositions={previewPositions}
              zoom={zoom}
              permissions={permissions}
              ownedByPlayer={ownedByPlayer}
              selectToken={selectToken}
              setSelectedTokenIds={setSelectedTokenIds}
              onTokenPointerDown={handleTokenPointerDown}
              boardRef={boardRef}
              onContextMenu={(token, x, y) => setContextMenu({ token, x, y })}
            />

            {/* Ping / Ruler / AoE / Token drag tools */}
            <MapTools
              canvasRef={boardRef as React.RefObject<HTMLDivElement | null>}
              zoom={zoom}
              gridSize={gridSize}
              isGM={isGM}
              wsRef={wsRef}
              selectedSceneId={selectedSceneId}
              snapToGrid={snapToGrid}
            />

            {/* Context menu */}
            {contextMenu && onTokenAction && (
              <TokenContextMenu
                token={contextMenu.token}
                x={contextMenu.x}
                y={contextMenu.y}
                onClose={() => setContextMenu(null)}
                onAction={(action, token, value) => {
                  // Center is handled locally
                  if (action === "center") {
                    if (scrollRef.current) {
                      scrollRef.current.scrollLeft =
                        token.x * zoom - scrollRef.current.clientWidth / 2;
                      scrollRef.current.scrollTop =
                        token.y * zoom - scrollRef.current.clientHeight / 2;
                    }
                  } else {
                    onTokenAction(action, token, value);
                  }
                  setContextMenu(null);
                }}
              />
            )}

            {/* Multi-select badge */}
            {selectedTokenIds.size > 1 && (
              <div className="multi-select-badge">
                {selectedTokenIds.size} tokens sélectionnés
                <button
                  type="button"
                  className="multi-select-clear"
                  onClick={() => setSelectedTokenIds(new Set())}
                  title="Tout désélectionner"
                >
                  ✕
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Minimap (visible by default, hidden only when showMiniMap=false) ── */}
      {showMiniMap !== false && (
        <MapMinimap
          selectedScene={selectedScene}
          sceneTokens={sceneTokens}
          zoom={zoom}
          fogZones={fogZones}
          isGM={isGM}
          gridSize={gridSize}
          isInFogZone={isInFogZone}
          scrollRef={scrollRef}
        />
      )}
    </div>
  );
}
