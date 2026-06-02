import { Grid3X3 } from "lucide-react";
import { type PointerEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Character, Scene, SceneToken } from "../api/types";
import { FogLayer } from "./FogLayer";
import { MapTools } from "./MapTools";
import { WeatherLayer, type WeatherType } from "./WeatherLayer";

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
  const [sceneTransitioning, setSceneTransitioning] = useState(false);
  const [weather, setWeather] = useState<WeatherType>("clear");
  const [weatherIntensity, setWeatherIntensity] = useState(50);
  const [weatherEnabled, setWeatherEnabled] = useState(false);

  // Minimap ref
  const minimapRef = useRef<HTMLCanvasElement>(null);

  // Reset zoom and center on scene when scene changes
  useEffect(() => {
    setSceneTransitioning(true);
    const timer = setTimeout(() => setSceneTransitioning(false), 300);
    setZoom(1);
    const el = scrollRef.current;
    if (el && selectedScene) {
      const sw = selectedScene.width ?? 2800;
      const sh = selectedScene.height ?? 2100;
      el.scrollLeft = Math.max(0, (sw - el.clientWidth) / 2);
      el.scrollTop = Math.max(0, (sh - el.clientHeight) / 2);
    } else if (el) {
      el.scrollLeft = 0;
      el.scrollTop = 0;
    }
    return () => clearTimeout(timer);
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
        .map((t) => t.id),
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

  // ── Keyboard shortcuts ───────────────────────────────────────────────────
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Don't capture when typing in an input
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

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
          setZoom(1);
          if (scrollRef.current && selectedScene) {
            const sw = selectedScene.width ?? 2800;
            const sh = selectedScene.height ?? 2100;
            scrollRef.current.scrollLeft = Math.max(0, (sw - scrollRef.current.clientWidth) / 2);
            scrollRef.current.scrollTop = Math.max(0, (sh - scrollRef.current.clientHeight) / 2);
          }
          break;
        case "z":
        case "Z":
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            window.dispatchEvent(new CustomEvent("undo-token-move"));
          }
          break;
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedScene]);

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

  const snapToGrid = useCallback(
    (value: number) => Math.round(value / gridSize) * gridSize,
    [gridSize],
  );

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

  // ── Minimap rendering ────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = minimapRef.current;
    if (!canvas || !selectedScene) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const bw = selectedScene.width;
    const bh = selectedScene.height;
    const cw = canvas.width;
    const ch = canvas.height;
    const scale = Math.min(cw / bw, ch / bh);

    // Clear
    ctx.clearRect(0, 0, cw, ch);

    // Draw background (dark, matching --bg-canvas)
    ctx.fillStyle = "#0B0F17";
    ctx.fillRect(0, 0, cw, ch);

    // Draw scene area
    const sx = (cw - bw * scale) / 2;
    const sy = (ch - bh * scale) / 2;
    ctx.fillStyle = "#101816";
    ctx.fillRect(sx, sy, bw * scale, bh * scale);

    // Draw grid hint
    ctx.strokeStyle = "#2B3A34";
    ctx.lineWidth = 0.5;
    const gs = gridSize * scale;
    for (let x = sx; x <= sx + bw * scale; x += gs) {
      ctx.beginPath();
      ctx.moveTo(x, sy);
      ctx.lineTo(x, sy + bh * scale);
      ctx.stroke();
    }
    for (let y = sy; y <= sy + bh * scale; y += gs) {
      ctx.beginPath();
      ctx.moveTo(sx, y);
      ctx.lineTo(sx + bw * scale, y);
      ctx.stroke();
    }

    // Draw token dots
    for (const t of sceneTokens) {
      ctx.fillStyle = t.color || "#c5b358";
      ctx.beginPath();
      ctx.arc(sx + (t.x / bw) * bw * scale, sy + (t.y / bh) * bh * scale, 2, 0, Math.PI * 2);
      ctx.fill();
    }

    // Draw viewport rectangle
    const el = scrollRef.current;
    if (el) {
      const vx = (el.scrollLeft / bw) * bw * scale;
      const vy = (el.scrollTop / bh) * bh * scale;
      const vw = (el.clientWidth / zoom / bw) * bw * scale;
      const vh = (el.clientHeight / zoom / bh) * bh * scale;
      ctx.strokeStyle = "#c5b358";
      ctx.lineWidth = 1;
      ctx.strokeRect(sx + vx, sy + vy, vw, vh);
    }
  }, [selectedScene, sceneTokens, zoom, sceneBackgroundObjectUrl]);

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
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        )}

        {scenes.length <= 1 && <strong>{selectedScene.name}</strong>}

        <div className="campaign-map-zoom">
          <button type="button" onClick={() => updateZoom(-ZOOM_STEP)} aria-label="Zoom arrière">
            −
          </button>
          <span>{zoomPercent}%</span>
          <button type="button" onClick={() => updateZoom(ZOOM_STEP)} aria-label="Zoom avant">
            +
          </button>
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
            className={`campaign-map-board ${sceneBackgroundObjectUrl ? "with-background" : ""} ${dragTokenId ? "is-dragging" : ""} ${showGrid ? "show-grid" : ""} ${sceneTransitioning ? "scene-transitioning" : ""}`}
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
            {sceneTokens.map((token) => {
              const hpPercent = token.metadata?.hp_max
                ? Math.round(
                    (((token.metadata?.hp_current as number) ?? 0) /
                      (token.metadata.hp_max as number)) *
                      100,
                  )
                : null;

              const isPlayerToken = myTokenIds.has(token.id);
              const isBloodied = hpPercent !== null && hpPercent <= 50 && hpPercent > 0;
              const isDefeated = hpPercent !== null && hpPercent <= 0;
              const isConcentrating =
                (token.metadata as Record<string, unknown> | null)?.conditions &&
                Array.isArray((token.metadata as Record<string, unknown>)?.conditions) &&
                ((token.metadata as Record<string, unknown>)?.conditions as string[]).includes(
                  "concentrating",
                );

              /* Conditions visuelles sur les tokens */
              const conditions: string[] =
                (token.metadata as Record<string, unknown> | null)?.conditions &&
                Array.isArray((token.metadata as Record<string, unknown>)?.conditions)
                  ? ((token.metadata as Record<string, unknown>)?.conditions as string[])
                  : [];

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

              return (
                <div
                  className={`campaign-map-token ${selectedTokenId === token.id ? "selected" : ""} ${dragTokenId === token.id ? "dragging" : ""} ${isPlayerToken && isGM ? "player-owned" : ""} ${isBloodied ? "token-bloodied" : ""} ${isDefeated ? "token-defeated" : ""} ${isConcentrating ? "token-concentrating" : ""}`}
                  key={token.id}
                  data-token-id={token.id}
                  onClick={() => (isGM ? setSelectedTokenId(token.id) : undefined)}
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
                  {selectedTokenId === token.id && <div className="token-ring" />}
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

      {/* ── Minimap ─────────────────────────────────────────── */}
      <canvas ref={minimapRef} className="campaign-map-minimap" width={160} height={120} />
    </div>
  );
}
