import { type PointerEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Grid3X3 } from "lucide-react";
import { FogLayer } from "./FogLayer";
import { MapTools } from "./MapTools";
import type { Character, Scene, SceneToken } from "../api/types";

// ─── Types ────────────────────────────────────────────────────────────────

type TokenDragHandler = (token: SceneToken, dx: number, dy: number) => void;

type CampaignMapProps = {
  campaignId: string;
  token: string;
  scenes: Scene[];
  selectedScene: Scene | undefined;
  selectedSceneId: string;
  sceneTokens: SceneToken[];
  sceneBackgroundObjectUrl: string;
  characters: Character[];
  userId?: string;
  isGM: boolean;
  wsRef: React.RefObject<WebSocket | null>;
  onSelectScene?: (sceneId: string) => void;
  onLoadSceneTokens?: (sceneId: string) => void;
  onMoveToken?: TokenDragHandler;
};

// ─── Constants ────────────────────────────────────────────────────────────

const MIN_ZOOM = 0.2;
const MAX_ZOOM = 3.0;
const ZOOM_STEP = 0.1;
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
  characters,
  isGM,
  wsRef,
  userId,
  onSelectScene,
  onLoadSceneTokens,
  onMoveToken,
}: CampaignMapProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const boardRef = useRef<HTMLDivElement>(null);

  const [zoom, setZoom] = useState(1);
  const [panMode, setPanMode] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const [panOrigin, setPanOrigin] = useState({ x: 0, y: 0 });
  const [dragTokenId, setDragTokenId] = useState("");
  const [selectedTokenId, setSelectedTokenId] = useState("");
  const [showGrid, setShowGrid] = useState(true);

  // Reset zoom/scroll when scene changes
  useEffect(() => {
    setZoom(1);
    if (scrollRef.current) {
      scrollRef.current.scrollLeft = 0;
      scrollRef.current.scrollTop = 0;
    }
  }, [selectedSceneId]);

  const zoomPercent = Math.round(zoom * 100);
  const gridSize = selectedScene?.grid_size ?? 50;

  // Memoized myTokenIds to avoid new Set() on every render
  const myTokenIds = useMemo(() => {
    if (isGM) return new Set(sceneTokens.map((t) => t.id));
    return new Set(
      sceneTokens
        .filter((t) => {
          if (!t.character_id || !userId) return false;
          return characters.some((c) => c.id === t.character_id && c.owner_user_id === userId);
        })
        .map((t) => t.id)
    );
  }, [isGM, sceneTokens, characters, userId]);

  // ── Zoom (toward cursor) ────────────────────────────────────────────────

  function updateZoom(delta: number, cursorX?: number, cursorY?: number) {
    const el = scrollRef.current;
    if (!el || cursorX === undefined || cursorY === undefined) {
      setZoom((current) => Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, current + delta)));
      return;
    }

    setZoom((current) => {
      const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, current + delta));
      if (newZoom === current) return current;

      const rect = el.getBoundingClientRect();
      const offsetX = cursorX - rect.left;
      const offsetY = cursorY - rect.top;

      const scale = newZoom / current;
      el.scrollLeft = (el.scrollLeft + offsetX) * scale - offsetX;
      el.scrollTop = (el.scrollTop + offsetY) * scale - offsetY;

      return newZoom;
    });
  }

  function handleWheel(event: WheelEvent) {
    event.preventDefault();
    updateZoom(event.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP, event.clientX, event.clientY);
  }

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleWheel);
  }, []);

  // ── Pan ─────────────────────────────────────────────────────────────────

  function handlePanPointerDown(event: PointerEvent) {
    if (isGM && !panMode) return;
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
  }

  // ── Token interaction (GM only, snap-to-grid) ───────────────────────────

  const snapToGrid = useCallback((value: number) => Math.round(value / gridSize) * gridSize, [gridSize]);

  function handleTokenPointerDown(event: PointerEvent, token: SceneToken) {
    if (!isGM || !onMoveToken) return;
    event.stopPropagation();
    setDragTokenId(token.id);
    setSelectedTokenId(token.id);
    (event.target as HTMLElement).setPointerCapture(event.pointerId);
  }

  function handleBoardPointerMove(event: PointerEvent) {
    if (!dragTokenId || !onMoveToken || !gridSize) return;
    const rawDx = event.movementX / zoom;
    const rawDy = event.movementY / zoom;
    const dx = snapToGrid(rawDx);
    const dy = snapToGrid(rawDy);
    if (dx !== 0 || dy !== 0) {
      const token = sceneTokens.find((t) => t.id === dragTokenId);
      if (token) onMoveToken(token, dx, dy);
    }
  }

  function handleBoardPointerUp() {
    setDragTokenId("");
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
      <div className="campaign-map-toolbar">
        {scenes.length > 1 && onSelectScene && (
          <select
            value={selectedSceneId}
            onChange={(e) => {
              onSelectScene(e.target.value);
              onLoadSceneTokens?.(e.target.value);
            }}
          >
            {scenes.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        )}

        {scenes.length <= 1 && (
          <strong>{selectedScene.name}</strong>
        )}

        <div className="campaign-map-zoom">
          <button type="button" onClick={() => updateZoom(-ZOOM_STEP)} aria-label="Zoom arrière">−</button>
          <span>{zoomPercent}%</span>
          <button type="button" onClick={() => updateZoom(ZOOM_STEP)} aria-label="Zoom avant">+</button>
        </div>

        {/* Grid toggle */}
        <button
          type="button"
          className={`campaign-map-grid-toggle ${showGrid ? "active" : ""}`}
          onClick={() => setShowGrid((g) => !g)}
          title={showGrid ? "Masquer la grille" : "Afficher la grille"}
        >
          <Grid3X3 size={14} />
        </button>

        {/* Pan toggle */}
        <button
          type="button"
          className={`campaign-map-pan-toggle ${panMode ? "active" : ""}`}
          onClick={() => setPanMode((p) => !p)}
        >
          {panMode ? "✋ Pan ON" : "✋ Pan"}
        </button>
      </div>

      {/* ── Map viewport ─────────────────────────────────────── */}
      <div
        ref={scrollRef}
        className={`campaign-map-viewport ${panMode ? "pan-mode" : ""} ${isPanning ? "panning" : ""}`}
        onPointerDown={handlePanPointerDown}
        onPointerMove={handlePanPointerMove}
        onPointerUp={handlePanPointerUp}
        onPointerCancel={handlePanPointerUp}
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
            className={`campaign-map-board ${sceneBackgroundObjectUrl ? "with-background" : ""} ${dragTokenId ? "is-dragging" : ""} ${showGrid ? "show-grid" : ""}`}
            onPointerMove={isGM ? handleBoardPointerMove : undefined}
            onPointerUp={isGM ? handleBoardPointerUp : undefined}
            onPointerCancel={isGM ? () => setDragTokenId("") : undefined}
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
              zoom={zoom}
              panMode={panMode}
            />

            {/* Tokens */}
            {sceneTokens.map((token) => {
              const hpPercent = token.metadata?.hp_max
                ? Math.round(((token.metadata?.hp_current as number) ?? 0) / (token.metadata.hp_max as number) * 100)
                : null;
              const isPlayerToken = myTokenIds.has(token.id);

              return (
                <div
                  className={`campaign-map-token ${selectedTokenId === token.id ? "selected" : ""} ${dragTokenId === token.id ? "dragging" : ""} ${isPlayerToken && isGM ? "player-owned" : ""}`}
                  key={token.id}
                  data-token-id={token.id}
                  onClick={() => isGM ? setSelectedTokenId(token.id) : undefined}
                  onPointerDown={(e) => handleTokenPointerDown(e, token)}
                  style={{
                    left: token.x,
                    top: token.y,
                    width: token.size * gridSize,
                    height: token.size * gridSize,
                    background: token.color,
                  }}
                  title={`${token.name} (${token.x}, ${token.y})`}
                >
                  {/* Token icon (first 2 letters) */}
                  <span className="token-icon">{token.name.slice(0, 2).toUpperCase()}</span>

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

                  {/* Selection ring */}
                  {selectedTokenId === token.id && (
                    <div className="token-ring" />
                  )}
                </div>
              );
            })}

            {/* Ping / Ruler / AoE / Token drag tools */}
            <MapTools
              canvasRef={boardRef as React.RefObject<HTMLDivElement | null>}
              zoom={zoom}
              gridSize={gridSize}
              isGM={isGM}
              wsRef={wsRef}
              selectedSceneId={selectedSceneId}
              myTokenIds={myTokenIds}
              snapToGrid={snapToGrid}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
