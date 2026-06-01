import { useEffect, useRef, useState, type MouseEvent as ReactMouseEvent } from "react";
import { Eye, EyeOff } from "lucide-react";

const TOKEN_KEY = "dnd_access_token";

type FogZone = { x: number; y: number; width: number; height: number };

type FogLayerProps = {
  sceneId: string;
  sceneWidth: number;
  sceneHeight: number;
  isGM: boolean;
  zoom?: number;
  panMode?: boolean;
};

export function FogLayer({ sceneId, sceneWidth, sceneHeight, isGM, zoom = 1, panMode = false }: FogLayerProps) {
  const token = localStorage.getItem(TOKEN_KEY) ?? "";
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [zones, setZones] = useState<FogZone[]>([]);
  const [drawing, setDrawing] = useState(false);
  const [start, setStart] = useState({ x: 0, y: 0 });
  const [currentRect, setCurrentRect] = useState<FogZone | null>(null);
  const [showFog, setShowFog] = useState(true);
  const canvasScale = 1;

  // Allow fog drawing only when fog is ON, GM mode, and pan is OFF
  const fogInteractive = isGM && showFog && !panMode;

  // Load zones from API
  async function loadZones() {
    if (!sceneId) return;
    try {
      const res = await fetch(`/api/scenes/${sceneId}/fog`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setZones(data.fog_zones || []);
      }
    } catch {
      // ignore
    }
  }

  useEffect(() => { void loadZones(); }, [sceneId]);

  // Save zones to API
  async function saveZones(newZones: FogZone[]) {
    try {
      await fetch(`/api/scenes/${sceneId}/fog`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ fog_zones: newZones }),
      });
    } catch {
      // ignore
    }
  }

  // Draw fog on canvas
  function draw() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const w = sceneWidth || 1200;
    const h = sceneHeight || 800;
    canvas.width = w;
    canvas.height = h;

    // Full fog overlay
    if (showFog) {
      ctx.fillStyle = isGM ? "rgba(0,0,0,0.45)" : "rgba(0,0,0,0.85)";
      ctx.fillRect(0, 0, w, h);

      // Cut out revealed zones
      ctx.globalCompositeOperation = "destination-out";
      for (const zone of zones) {
        ctx.fillStyle = "white";
        ctx.fillRect(zone.x, zone.y, zone.width, zone.height);
      }
      ctx.globalCompositeOperation = "source-over";

      // Current drawing rect
      if (currentRect && isGM) {
        ctx.strokeStyle = "#22c55e";
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 4]);
        ctx.strokeRect(currentRect.x, currentRect.y, currentRect.width, currentRect.height);
        ctx.setLineDash([]);
        ctx.fillStyle = "rgba(34, 197, 94, 0.15)";
        ctx.fillRect(currentRect.x, currentRect.y, currentRect.width, currentRect.height);
      }

      // Zone borders for GM
      if (isGM) {
        for (const zone of zones) {
          ctx.strokeStyle = "rgba(34, 197, 94, 0.5)";
          ctx.lineWidth = 1;
          ctx.strokeRect(zone.x, zone.y, zone.width, zone.height);
        }
      }
    }
  }

  useEffect(() => { draw(); }, [zones, currentRect, showFog, isGM, sceneWidth, sceneHeight]);

  // Mouse handlers for GM reveal tool
  function handleMouseDown(e: ReactMouseEvent<HTMLCanvasElement>) {
    if (!fogInteractive) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / zoom;
    const y = (e.clientY - rect.top) / zoom;
    setStart({ x, y });
    setDrawing(true);
    setCurrentRect({ x, y, width: 0, height: 0 });
  }

  function handleMouseMove(e: ReactMouseEvent<HTMLCanvasElement>) {
    if (!drawing || !fogInteractive) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / zoom;
    const y = (e.clientY - rect.top) / zoom;
    setCurrentRect({
      x: Math.min(start.x, x),
      y: Math.min(start.y, y),
      width: Math.abs(x - start.x),
      height: Math.abs(y - start.y),
    });
  }

  function handleMouseUp() {
    if (!drawing || !isGM) return;
    setDrawing(false);
    if (currentRect && currentRect.width > 10 && currentRect.height > 10) {
      const newZones = [...zones, currentRect];
      setZones(newZones);
      void saveZones(newZones);
    }
    setCurrentRect(null);
  }

  function clearAll() {
    setZones([]);
    void saveZones([]);
  }

  if (!sceneId) return null;

  return (
    <div
      className="fog-layer-container"
      style={{
        width: sceneWidth || 1200,
        height: sceneHeight || 800,
        pointerEvents: fogInteractive ? "auto" : "none",
      }}
    >
      <canvas
        ref={canvasRef}
        className="fog-canvas"
        style={{
          width: "100%",
          height: "100%",
          cursor: fogInteractive ? "crosshair" : "default",
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      />
      {isGM && (
        <div className="fog-toolbar">
          <button
            className={`fog-toggle-btn ${showFog ? "active" : ""}`}
            onClick={() => setShowFog(!showFog)}
            type="button"
            title={showFog ? "Masquer le brouillard" : "Afficher le brouillard"}
          >
            {showFog ? <EyeOff size={14} /> : <Eye size={14} />}
            {showFog ? "Fog ON" : "Fog OFF"}
          </button>
          {zones.length > 0 && (
            <button className="ghost-button compact" onClick={clearAll} type="button">
              Reset
            </button>
          )}
        </div>
      )}
    </div>
  );
}
