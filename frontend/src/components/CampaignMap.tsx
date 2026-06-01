import { type PointerEvent, useEffect, useRef, useState } from "react";
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
  /** ID of the current user (for filtering player-controllable tokens) */
  userId?: string;
  /** true = GM (move tokens, edit fog), false = Player (read-only) */
  isGM: boolean;
  /** WebSocket ref for real-time ping/ruler/token drag */
  wsRef: React.RefObject<WebSocket | null>;
  // GM-only callbacks
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

  const zoomPercent = Math.round(zoom * 100);
  const gridSize = selectedScene?.grid_size ?? 50;

  // ── Zoom ────────────────────────────────────────────────────────────────

  function updateZoom(delta: number) {
    setZoom((current) => Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, current + delta)));
  }

  function handleWheel(event: WheelEvent) {
    event.preventDefault();
    updateZoom(event.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP);
  }

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleWheel);
  }, []);

  // ── Pan ─────────────────────────────────────────────────────────────────

  function handlePanPointerDown(event: PointerEvent) {
    if (!panMode && isGM) return;
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

  // ── Token interaction (GM only) ─────────────────────────────────────────

  function handleTokenPointerDown(event: PointerEvent, token: SceneToken) {
    if (!isGM || !onMoveToken) return;
    event.stopPropagation();
    setDragTokenId(token.id);
    setSelectedTokenId(token.id);
    (event.target as HTMLElement).setPointerCapture(event.pointerId);
  }

  function handleBoardPointerMove(event: PointerEvent) {
    if (!dragTokenId || !onMoveToken || !gridSize) return;
    const token = sceneTokens.find((t) => t.id === dragTokenId);
    if (!token) return;
    const dx = Math.round(event.movementX / zoom / gridSize) * gridSize;
    const dy = Math.round(event.movementY / zoom / gridSize) * gridSize;
    if (dx !== 0 || dy !== 0) {
      onMoveToken(token, dx, dy);
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

        {/* Pan toggle — always available for player, optional for GM */}
        {(!isGM || panMode !== undefined) && (
          <button
            type="button"
            className={`campaign-map-pan-toggle ${panMode ? "active" : ""}`}
            onClick={() => setPanMode((p) => !p)}
          >
            {panMode ? "✋ Pan ON" : "✋ Pan"}
          </button>
        )}
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
            className={`campaign-map-board ${sceneBackgroundObjectUrl ? "with-background" : ""} ${dragTokenId ? "is-dragging" : ""}`}
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
            {sceneTokens.map((token) => (
              <button
                className={`campaign-map-token ${selectedTokenId === token.id ? "selected" : ""} ${dragTokenId === token.id ? "dragging" : ""}`}
                key={token.id}
                onClick={() => isGM && setSelectedTokenId(token.id)}
                onPointerDown={(e) => handleTokenPointerDown(e, token)}
                style={{
                  left: token.x,
                  top: token.y,
                  width: token.size * gridSize,
                  height: token.size * gridSize,
                  background: token.color,
                  pointerEvents: isGM ? "auto" : "none",
                }}
                title={`${token.name} (${token.x}, ${token.y})`}
                type="button"
              >
                {token.name.slice(0, 2).toUpperCase()}
              </button>
            ))}

            {/* Ping / Ruler / Token drag tools */}
            <MapTools
              canvasRef={boardRef as React.RefObject<HTMLDivElement | null>}
              zoom={zoom}
              isGM={isGM}
              wsRef={wsRef}
              myTokenIds={
                isGM
                  ? new Set(sceneTokens.map((t) => t.id))
                  : new Set(
                      sceneTokens
                        .filter((t) => {
                          if (!t.character_id || !userId) return false;
                          return characters.some((c) => c.id === t.character_id && c.owner_user_id === userId);
                        })
                        .map((t) => t.id)
                    )
              }
            />
          </div>
        </div>
      </div>
    </div>
  );
}
