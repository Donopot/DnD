import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { Circle, Crosshair, Ruler, Square, Triangle } from "lucide-react";

type Ping = { id: number; x: number; y: number; ts: number };
type RulerLine = { x1: number; y1: number; x2: number; y2: number; userId: string };
type AoeShape = {
  id: number;
  shape: "cone" | "sphere" | "cube" | "line";
  x: number;
  y: number;
  size: number;   // in feet
  angle: number;   // degrees
  userId: string;
};

const AOE_TOOLS = ["cone", "sphere", "cube", "line"] as const;
const AOE_LABELS: Record<string, string> = {
  cone: "Cône (15/30/60 ft)",
  sphere: "Sphère (10/20/30 ft)",
  cube: "Cube (10/15/20 ft)",
  line: "Ligne (30/60/100 ft)",
};
const AOE_ICONS: Record<string, typeof Triangle> = {
  cone: Triangle,
  sphere: Circle,
  cube: Square,
  line: Ruler,
};
const AOE_SIZES: Record<string, number[]> = {
  cone: [15, 30, 60],
  sphere: [10, 20, 30, 40],
  cube: [10, 15, 20, 30],
  line: [30, 60, 100],
};

type MapToolsProps = {
  canvasRef: React.RefObject<HTMLDivElement | null>;
  zoom: number;
  gridSize: number;  // pixels per 5ft square
  isGM: boolean;
  wsRef: React.RefObject<WebSocket | null>;
  myTokenIds?: Set<string>;
};

export function MapTools({ canvasRef, zoom, gridSize, isGM, wsRef, myTokenIds }: MapToolsProps) {
  const [tool, setTool] = useState<"none" | "ping" | "ruler" | "aoe">("none");
  const [aoeShape, setAoeShape] = useState<"cone" | "sphere" | "cube" | "line">("sphere");
  const [aoeSize, setAoeSize] = useState(30);
  const [aoeAngle, setAoeAngle] = useState(0);
  const [pings, setPings] = useState<Ping[]>([]);
  const [rulers, setRulers] = useState<RulerLine[]>([]);
  const [aoeShapes, setAoeShapes] = useState<AoeShape[]>([]);
  const [dragToken, setDragToken] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [rulerStart, setRulerStart] = useState<{ x: number; y: number } | null>(null);
  const [rulerEnd, setRulerEnd] = useState<{ x: number; y: number } | null>(null);
  const pingId = useRef(0);
  const aoeId = useRef(0);

  // Listen for WebSocket events
  useEffect(() => {
    const ws = wsRef.current;
    if (!ws) return;

    function handleMessage(e: MessageEvent) {
      try {
        const msg = JSON.parse(e.data);
        if (msg.type === "map_ping") {
          const id = ++pingId.current;
          setPings((prev) => [...prev.slice(-5), { id, x: msg.x, y: msg.y, ts: msg.ts }]);
          setTimeout(() => setPings((prev) => prev.filter((p) => p.id !== id)), 2500);
        } else if (msg.type === "ruler") {
          setRulers((prev) => [
            ...prev.slice(-3),
            { x1: msg.x1, y1: msg.y1, x2: msg.x2, y2: msg.y2, userId: msg.user_id },
          ]);
          setTimeout(() => setRulers((prev) => prev.slice(1)), 5000);
        } else if (msg.type === "aoe_shape") {
          const id = ++aoeId.current;
          setAoeShapes((prev) => [
            ...prev.slice(-5),
            {
              id,
              shape: msg.shape,
              x: msg.x,
              y: msg.y,
              size: msg.size,
              angle: msg.angle ?? 0,
              userId: msg.user_id,
            },
          ]);
          setTimeout(() => setAoeShapes((prev) => prev.filter((s) => s.id !== id)), 6000);
        } else if (msg.type === "token_moved") {
          const tokenEl = document.querySelector(`[data-token-id="${msg.token_id}"]`) as HTMLElement;
          if (tokenEl) {
            tokenEl.style.left = `${msg.x}px`;
            tokenEl.style.top = `${msg.y}px`;
          }
        }
      } catch { /* ignore */ }
    }

    ws.addEventListener("message", handleMessage);
    return () => ws.removeEventListener("message", handleMessage);
  }, [wsRef]);

  function getMapCoords(e: ReactPointerEvent): { x: number; y: number } {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return { x: (e.clientX - rect.left) / zoom, y: (e.clientY - rect.top) / zoom };
  }

  function sendWS(msg: object) {
    const ws = wsRef.current;
    if (ws?.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg));
  }

  // ── Ping ──────────────────────────────────────────────────────────────────
  function handlePing(e: ReactPointerEvent) {
    if (tool !== "ping") return;
    const coords = getMapCoords(e);
    sendWS({ type: "map_ping", x: coords.x, y: coords.y, ts: Date.now() });
    setTool("none");
  }

  // ── Ruler ─────────────────────────────────────────────────────────────────
  function handleRulerStart(e: ReactPointerEvent) {
    if (tool !== "ruler") return;
    setRulerStart(getMapCoords(e));
  }

  function handleRulerMove(e: ReactPointerEvent) {
    if (!rulerStart) return;
    setRulerEnd(getMapCoords(e));
  }

  function handleRulerEnd() {
    if (!rulerStart || !rulerEnd) return;
    sendWS({ type: "ruler", x1: rulerStart.x, y1: rulerStart.y, x2: rulerEnd.x, y2: rulerEnd.y });
    setRulerStart(null);
    setRulerEnd(null);
    setTool("none");
  }

  // ── AoE ───────────────────────────────────────────────────────────────────
  function handleAoePlace(e: ReactPointerEvent) {
    if (tool !== "aoe") return;
    const coords = getMapCoords(e);
    sendWS({ type: "aoe_shape", shape: aoeShape, x: coords.x, y: coords.y, size: aoeSize, angle: aoeAngle });
    setTool("none");
  }

  function cycleAoeSize(delta: number) {
    const sizes = AOE_SIZES[aoeShape];
    const idx = sizes.indexOf(aoeSize);
    const next = (idx + delta + sizes.length) % sizes.length;
    setAoeSize(sizes[next]);
  }

  // ── Player token drag ─────────────────────────────────────────────────────
  function handleTokenDragStart(e: ReactPointerEvent, tokenId: string) {
    if (!myTokenIds?.has(tokenId)) return;
    e.stopPropagation();
    const coords = getMapCoords(e);
    const tokenEl = (e.target as HTMLElement).closest("[data-token-id]") as HTMLElement;
    const tokenX = parseFloat(tokenEl?.style.left || "0");
    const tokenY = parseFloat(tokenEl?.style.top || "0");
    setDragToken(tokenId);
    setDragOffset({ x: coords.x - tokenX, y: coords.y - tokenY });
  }

  function handleTokenDragMove(e: ReactPointerEvent) {
    if (!dragToken) return;
    const coords = getMapCoords(e);
    const tokenEl = document.querySelector(`[data-token-id="${dragToken}"]`) as HTMLElement;
    if (tokenEl) {
      tokenEl.style.left = `${coords.x - dragOffset.x}px`;
      tokenEl.style.top = `${coords.y - dragOffset.y}px`;
    }
  }

  function handleTokenDragEnd() {
    if (!dragToken) return;
    const tokenEl = document.querySelector(`[data-token-id="${dragToken}"]`) as HTMLElement;
    if (tokenEl) {
      sendWS({
        type: "player_move_token",
        token_id: dragToken,
        x: parseFloat(tokenEl.style.left || "0"),
        y: parseFloat(tokenEl.style.top || "0"),
        scene_id: "",
      });
    }
    setDragToken(null);
  }

  // Determine cursor
  let cursor = "default";
  if (tool === "ping" || tool === "aoe") cursor = "crosshair";
  if (tool === "ruler" && rulerStart) cursor = "crosshair";
  if (dragToken) cursor = "grabbing";

  // ── AoE shape renderer helpers ──────────────────────────────────────────
  function renderAoeShape(s: AoeShape) {
    const pxPerFoot = gridSize / 5;
    const sizePx = s.size * pxPerFoot;

    switch (s.shape) {
      case "sphere":
        return (
          <div
            key={s.id}
            className="aoe-shape aoe-sphere"
            style={{
              left: s.x - sizePx / 2,
              top: s.y - sizePx / 2,
              width: sizePx,
              height: sizePx,
              position: "absolute",
              zIndex: 48,
            }}
          />
        );
      case "cube":
        return (
          <div
            key={s.id}
            className="aoe-shape aoe-cube"
            style={{
              left: s.x - sizePx / 2,
              top: s.y - sizePx / 2,
              width: sizePx,
              height: sizePx,
              position: "absolute",
              zIndex: 48,
            }}
          />
        );
      case "cone":
        return (
          <div
            key={s.id}
            className="aoe-shape aoe-cone"
            style={{
              left: s.x,
              top: s.y,
              position: "absolute",
              zIndex: 48,
            }}
          >
            <svg width={sizePx} height={sizePx / 2} viewBox={`0 0 ${sizePx} ${sizePx / 2}`}
              style={{
                transform: `rotate(${s.angle}deg)`,
                transformOrigin: "0 50%",
                position: "absolute",
                left: 0,
                top: -(sizePx / 4),
              }}
            >
              <polygon
                points={`0,${sizePx / 4} ${sizePx},0 ${sizePx},${sizePx / 2}`}
                fill="rgba(197,179,88,0.12)"
                stroke="rgba(197,179,88,0.5)"
                strokeWidth={1}
              />
            </svg>
          </div>
        );
      case "line":
        return (
          <div
            key={s.id}
            className="aoe-shape aoe-line"
            style={{
              left: s.x,
              top: s.y - (gridSize / 2),
              width: sizePx,
              height: gridSize,
              position: "absolute",
              zIndex: 48,
              transform: `rotate(${s.angle}deg)`,
              transformOrigin: "0 50%",
            }}
          />
        );
    }
  }

  return (
    <>
      {/* ── Toolbar ────────────────────────────────────────────────────────── */}
      <div className="map-tools-bar">
        <button
          className={`map-tool-btn ${tool === "ping" ? "active" : ""}`}
          onClick={() => setTool(tool === "ping" ? "none" : "ping")}
          title="Ping (clic sur la carte)"
          type="button"
        >
          <Crosshair size={14} />
        </button>
        <button
          className={`map-tool-btn ${tool === "ruler" ? "active" : ""}`}
          onClick={() => setTool(tool === "ruler" ? "none" : "ruler")}
          title="Mesure (clic début → clic fin)"
          type="button"
        >
          <Ruler size={14} />
        </button>

        {/* ── AoE tools (GM only) ───────────────────────────────────────── */}
        {isGM && (
          <>
            <div className="map-tools-separator" />
            {AOE_TOOLS.map((shape) => {
              const Icon = AOE_ICONS[shape];
              return (
                <button
                  key={shape}
                  className={`map-tool-btn ${tool === "aoe" && aoeShape === shape ? "active" : ""}`}
                  onClick={() => {
                    setTool(tool === "aoe" && aoeShape === shape ? "none" : "aoe");
                    setAoeShape(shape);
                    setAoeSize(AOE_SIZES[shape][0]);
                  }}
                  title={AOE_LABELS[shape]}
                  type="button"
                >
                  <Icon size={14} />
                </button>
              );
            })}
          </>
        )}

        {/* ── AoE size selector ──────────────────────────────────────────── */}
        {tool === "aoe" && isGM && (
          <div className="aoe-size-selector">
            <button onClick={() => cycleAoeSize(-1)} type="button" className="aoe-size-btn">◀</button>
            <span className="aoe-size-label">{aoeSize} ft</span>
            <button onClick={() => cycleAoeSize(1)} type="button" className="aoe-size-btn">▶</button>
          </div>
        )}
      </div>

      {/* ── Overlay captures clicks for tools ─────────────────────────────── */}
      {(tool !== "none" || dragToken) && (
        <div
          className="map-tools-overlay"
          style={{ cursor }}
          onPointerDown={
            tool === "ruler" ? handleRulerStart
            : tool === "aoe" ? handleAoePlace
            : tool === "ping" ? handlePing
            : undefined
          }
          onPointerMove={tool === "ruler" ? handleRulerMove : dragToken ? handleTokenDragMove : undefined}
          onPointerUp={tool === "ruler" ? handleRulerEnd : dragToken ? handleTokenDragEnd : undefined}
        />
      )}

      {/* ── Ping dots ────────────────────────────────────────────────────── */}
      {pings.map((p) => (
        <div
          key={p.id}
          className="map-ping-dot"
          style={{ left: p.x, top: p.y, position: "absolute", zIndex: 50 }}
        />
      ))}

      {/* ── Rulers ────────────────────────────────────────────────────────── */}
      {rulers.map((r, i) => {
        const dx = r.x2 - r.x1;
        const dy = r.y2 - r.y1;
        const dist = Math.round(Math.sqrt(dx * dx + dy * dy) / 10) * 5;
        const angle = Math.atan2(dy, dx) * (180 / Math.PI);
        const length = Math.sqrt(dx * dx + dy * dy);
        return (
          <div key={i} className="map-ruler" style={{ left: r.x1, top: r.y1, position: "absolute", zIndex: 49 }}>
            <div
              className="ruler-line"
              style={{
                width: length,
                transform: `rotate(${angle}deg)`,
                transformOrigin: "0 0",
              }}
            />
            <span
              className="ruler-label"
              style={{
                left: r.x1 + dx / 2 - 20,
                top: r.y1 + dy / 2 - 10,
                position: "absolute",
              }}
            >
              {dist} ft
            </span>
          </div>
        );
      })}

      {/* ── Active ruler preview ──────────────────────────────────────────── */}
      {rulerStart && rulerEnd && (
        <div className="map-ruler preview" style={{ left: rulerStart.x, top: rulerStart.y, position: "absolute", zIndex: 49 }}>
          <div
            className="ruler-line"
            style={{
              width: Math.sqrt((rulerEnd.x - rulerStart.x) ** 2 + (rulerEnd.y - rulerStart.y) ** 2),
              transform: `rotate(${Math.atan2(rulerEnd.y - rulerStart.y, rulerEnd.x - rulerStart.x) * (180 / Math.PI)}deg)`,
              transformOrigin: "0 0",
            }}
          />
        </div>
      )}

      {/* ── AoE shapes ───────────────────────────────────────────────────── */}
      {aoeShapes.map(renderAoeShape)}
    </>
  );
}
