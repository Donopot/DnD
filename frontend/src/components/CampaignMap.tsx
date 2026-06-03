import { Crosshair, Grid3X3 } from "lucide-react";
import { type PointerEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Character, Scene, SceneToken } from "../api/types";
import { useNudgeSelectedToken } from "../hooks/useKeyboard";
import { useMapViewport } from "../hooks/useMapViewport";
import { FogLayer, type FogZone } from "./FogLayer";
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
  selectedTokenId?: string;
  onSelectToken?: (tokenId: string) => void;
  onLoadSceneTokens?: (sceneId: string) => void;
  onMoveToken?: TokenDragHandler;
  onTokenAction?: TokenActionHandler;
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
  characters,
  isGM,
  wsRef,
  userId,
  onSelectScene,
  onLoadSceneTokens,
  onMoveToken,
  onTokenAction,
  selectedTokenId: controlledSelectedTokenId,
  onSelectToken,
}: CampaignMapProps) {
  const boardRef = useRef<HTMLDivElement>(null);

  const {
    scrollRef,
    zoom,
    zoomIn,
    zoomOut,
    recenter,
    setViewportState,
  } = useMapViewport({
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
  const [previewPositions, setPreviewPositions] = useState<Record<string, { x: number; y: number }>>(
    {},
  );
  const [localSelectedTokenId, setLocalSelectedTokenId] = useState("");
  const [selectedTokenIds, setSelectedTokenIds] = useState<Set<string>>(new Set());
  const [showGrid, setShowGrid] = useState(true);
  const [sceneTransitioning, setSceneTransitioning] = useState(false);
  const [weather, _setWeather] = useState<WeatherType>("clear");
  const [weatherIntensity, _setWeatherIntensity] = useState(50);
  const [weatherEnabled, _setWeatherEnabled] = useState(false);

  // Fog of war zones (for token visibility filtering)
  const [fogZones, setFogZones] = useState<FogZone[]>([]);

  // Context menu state
  const [contextMenu, setContextMenu] = useState<{
    token: SceneToken;
    x: number;
    y: number;
  } | null>(null);

  // Minimap ref
  const minimapRef = useRef<HTMLCanvasElement>(null);
  const selectedTokenId = controlledSelectedTokenId ?? localSelectedTokenId;
  const dragTokenId = dragState?.tokenIds[0] ?? "";

  function selectToken(tokenId: string) {
    setLocalSelectedTokenId(tokenId);
    onSelectToken?.(tokenId);
  }

  useEffect(() => {
    if (controlledSelectedTokenId === undefined) return;
    setSelectedTokenIds(controlledSelectedTokenId ? new Set([controlledSelectedTokenId]) : new Set());
  }, [controlledSelectedTokenId]);

  // Scene transition animation (viewport centering handled by useMapViewport)
  useEffect(() => {
    setSceneTransitioning(true);
    const timer = setTimeout(() => setSceneTransitioning(false), 300);
    return () => clearTimeout(timer);
  }, [selectedSceneId]);

  // ── Fog zone loading ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!selectedScene?.id) {
      setFogZones([]);
      return;
    }
    const t = localStorage.getItem("dnd_access_token") || "";
    fetch(`/api/scenes/${selectedScene.id}/fog`, {
      headers: { Authorization: `Bearer ${t}` },
    })
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((d) => setFogZones(d.fog_zones || []))
      .catch(() => {});
  }, [selectedScene?.id]);

  // ── Fog zone WebSocket refresh ───────────────────────────────────────────
  useEffect(() => {
    const ws = wsRef.current;
    if (!ws) return;

    const handler = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        if (
          data.type === "session_changed" &&
          data.resource === "fog" &&
          data.scene_id === selectedSceneId
        ) {
          const t = localStorage.getItem("dnd_access_token") || "";
          fetch(`/api/scenes/${selectedSceneId}/fog`, {
            headers: { Authorization: `Bearer ${t}` },
          })
            .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
            .then((d) => setFogZones(d.fog_zones || []))
            .catch(() => {});
        }
      } catch {
        /* ignore */
      }
    };

    ws.addEventListener("message", handler);
    return () => ws.removeEventListener("message", handler);
  }, [wsRef, selectedSceneId]);

  const zoomPercent = Math.round(zoom * 100);
  const gridSize = selectedScene?.grid_size ?? 50;

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
        if (!isGM && !myTokenIds.has(t.id)) continue;
        onMoveToken(t, dx, dy);
      }
      // Also move the primary selected token if not already in the multi-set
      if (
        selectedToken &&
        !selectedTokenIds.has(selectedToken.id) &&
        (isGM || myTokenIds.has(selectedToken.id))
      ) {
        onMoveToken(selectedToken, dx, dy);
      }
    },
    {
      gridSize,
      enabled:
        Boolean(onMoveToken) &&
        (isGM ||
          selectedTokens.some((token) => myTokenIds.has(token.id)) ||
          Boolean(selectedToken && myTokenIds.has(selectedToken.id))),
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
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedScene]);

  // ── Pan ─────────────────────────────────────────────────────────────────

  function handlePanPointerDown(event: PointerEvent) {
    // Middle button (button=1) always triggers pan regardless of panMode/GM
    const isMiddleButton = event.button === 1;
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

  function handleTokenPointerDown(event: PointerEvent, token: SceneToken) {
    const canInteractWithToken = isGM || myTokenIds.has(token.id);
    if (!canInteractWithToken) return;
    event.stopPropagation();

    // Shift+click = toggle multi-select without starting drag
    if (event.shiftKey && isGM) {
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
    const canMoveToken = isGM || myTokenIds.has(token.id);
    const tokenIds =
      isGM && selectedTokenIds.has(token.id) && selectedTokenIds.size > 0
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
      if (sceneToken && (isGM || myTokenIds.has(sceneToken.id))) {
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
      // Skip tokens hidden by fog (players only)
      if (!isGM && fogZones.length > 0) {
        const tc = t.x + (t.size * gridSize) / 2;
        const ty = t.y + (t.size * gridSize) / 2;
        const revealed = fogZones.some(
          (z) => tc >= z.x && tc <= z.x + z.width && ty >= z.y && ty <= z.y + z.height,
        );
        if (!revealed) continue;
      }
      ctx.fillStyle = t.color || "#c5b358";
      ctx.beginPath();
      ctx.arc(sx + (t.x / bw) * bw * scale, sy + (t.y / bh) * bh * scale, 2, 0, Math.PI * 2);
      ctx.fill();
    }

    // Draw fog revealed zones on minimap
    if (fogZones.length > 0) {
      ctx.fillStyle = "rgba(214, 168, 79, 0.35)";
      for (const zone of fogZones) {
        const zx = sx + (zone.x / bw) * bw * scale;
        const zy = sy + (zone.y / bh) * bh * scale;
        const zw = (zone.width / bw) * bw * scale;
        const zh = (zone.height / bh) * bh * scale;
        if (zone.shape === "circle") {
          ctx.beginPath();
          ctx.arc(zx + zw / 2, zy + zh / 2, zw / 2, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillRect(zx, zy, zw, zh);
        }
      }
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
  }, [selectedScene, sceneTokens, zoom, fogZones, isGM, gridSize]);

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
          <button
            type="button"
            onClick={() => {
              const rect = scrollRef.current?.getBoundingClientRect();
              if (rect) zoomOut(rect.width / 2, rect.height / 2);
            }}
            aria-label="Zoom arrière"
          >
            −
          </button>
          <span>{zoomPercent}%</span>
          <button
            type="button"
            onClick={() => {
              const rect = scrollRef.current?.getBoundingClientRect();
              if (rect) zoomIn(rect.width / 2, rect.height / 2);
            }}
            aria-label="Zoom avant"
          >
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

        {/* Recenter button */}
        <button
          type="button"
          className="campaign-map-recenter"
          onClick={recenter}
          title="Recentrer la scène"
        >
          <Crosshair size={14} />
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

              // ── Fog visibility filter (players only) ──────────
              // Tokens whose center is not in any revealed zone are hidden
              if (!isGM && fogZones.length > 0) {
                const tokenCenterX = token.x + (token.size * gridSize) / 2;
                const tokenCenterY = token.y + (token.size * gridSize) / 2;
                const isRevealed = fogZones.some(
                  (zone) =>
                    tokenCenterX >= zone.x &&
                    tokenCenterX <= zone.x + zone.width &&
                    tokenCenterY >= zone.y &&
                    tokenCenterY <= zone.y + zone.height,
                );
                if (!isRevealed) return null;
              }

              // ── GM fog indicator: token is hidden from players
              let isFogHidden = false;
              if (isGM && fogZones.length > 0) {
                const tokenCenterX = token.x + (token.size * gridSize) / 2;
                const tokenCenterY = token.y + (token.size * gridSize) / 2;
                isFogHidden = !fogZones.some(
                  (zone) =>
                    tokenCenterX >= zone.x &&
                    tokenCenterX <= zone.x + zone.width &&
                    tokenCenterY >= zone.y &&
                    tokenCenterY <= zone.y + zone.height,
                );
              }

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
                  className={`campaign-map-token ${selectedTokenId === token.id ? "selected" : ""} ${selectedTokenIds.has(token.id) && selectedTokenId !== token.id ? "group-selected" : ""} ${dragTokenId === token.id ? "dragging" : ""} ${isPlayerToken && isGM ? "player-owned" : ""} ${isBloodied ? "token-bloodied" : ""} ${isDefeated ? "token-defeated" : ""} ${isConcentrating ? "token-concentrating" : ""} ${isFogHidden ? "fog-hidden" : ""}`}
                  key={token.id}
                  data-token-id={token.id}
                  role="button"
                  tabIndex={0}
                  aria-label={`Token ${token.name}, position (${token.x}, ${token.y})${selectedTokenId === token.id ? " — sélectionné" : ""}${selectedTokenIds.has(token.id) && selectedTokenId !== token.id ? " — groupe" : ""}`}
                  onClick={() => {
                    if (!isGM && !myTokenIds.has(token.id)) return;
                    selectToken(token.id);
                    setSelectedTokenIds(new Set([token.id]));
                  }}
                  onKeyDown={(e) => {
                    if ((e.key === "Enter" || e.key === " ") && (isGM || myTokenIds.has(token.id))) {
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
                  onPointerDown={(e) => handleTokenPointerDown(e, token)}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const rect = boardRef.current?.getBoundingClientRect();
                    if (!rect) return;
                    setContextMenu({
                      token,
                      x: (e.clientX - rect.left) / zoom,
                      y: (e.clientY - rect.top) / zoom,
                    });
                  }}
                  style={{
                    left: previewPositions[token.id]?.x ?? token.x,
                    top: previewPositions[token.id]?.y ?? token.y,
                    width: token.size * gridSize,
                    height: token.size * gridSize,
                    background: token.color,
                  }}
                >
                  {/* Token icon (first 2 letters) */}
                  <span className="token-icon">{token.name.slice(0, 2).toUpperCase()}</span>

                  {/* Fog-hidden indicator (GM only) */}
                  {isFogHidden && (
                    <span className="token-fog-icon" title="Caché aux joueurs (brouillard)">
                      👁️‍🗨️
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
          </div>
        </div>
      </div>

      {/* ── Minimap ─────────────────────────────────────────── */}
      <canvas ref={minimapRef} className="campaign-map-minimap" width={160} height={120} />
    </div>
  );
}
