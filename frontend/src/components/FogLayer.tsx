import { type MouseEvent as ReactMouseEvent, useEffect, useRef } from "react";

export type FogZone = {
  x: number;
  y: number;
  width: number;
  height: number;
  shape?: "rect" | "circle";
};

type FogLayerProps = {
  sceneId: string;
  sceneWidth: number;
  sceneHeight: number;
  isGM: boolean;
  canEditFog?: boolean;
  zoom?: number;
  panMode?: boolean;
  /** Fog zones from parent (single source of truth) */
  fogZones: FogZone[];
  /** Called when zones are modified (draw, erase, undo, clear) */
  onZonesChange: (zones: FogZone[]) => void;
  /** Tool controls lifted from parent */
  showFog: boolean;
  drawMode: boolean;
  circleMode: boolean;
  eraseMode: boolean;
  /** Drawing preview state */
  drawing: boolean;
  setDrawing: (v: boolean) => void;
  start: { x: number; y: number };
  setStart: (v: { x: number; y: number }) => void;
  currentRect: FogZone | null;
  setCurrentRect: (v: FogZone | null) => void;
  saveError: string;
  setSaveError: (v: string) => void;
};

export function FogLayer({
  sceneId: _sceneId,
  sceneWidth,
  sceneHeight,
  isGM,
  canEditFog,
  zoom = 1,
  panMode = false,
  fogZones,
  onZonesChange,
  showFog,
  drawMode,
  circleMode,
  eraseMode,
  drawing,
  setDrawing,
  start,
  setStart,
  currentRect,
  setCurrentRect,
  saveError,
  setSaveError,
}: FogLayerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // The fog canvas only captures clicks when explicitly drawing or erasing.
  const canEdit = canEditFog ?? isGM;
  const fogInteractive = canEdit && showFog && (drawMode || eraseMode) && !panMode;

  // ── Draw fog on canvas ──────────────────────────────────────────────────
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
      for (const zone of fogZones) {
        if (zone.shape === "circle") {
          ctx.beginPath();
          ctx.arc(
            zone.x + zone.width / 2,
            zone.y + zone.height / 2,
            zone.width / 2,
            0,
            Math.PI * 2,
          );
          ctx.fillStyle = "white";
          ctx.fill();
        } else {
          ctx.fillStyle = "white";
          ctx.fillRect(zone.x, zone.y, zone.width, zone.height);
        }
      }
      ctx.globalCompositeOperation = "source-over";

      // Current drawing preview
      if (currentRect && isGM) {
        if (currentRect.shape === "circle") {
          ctx.beginPath();
          ctx.arc(
            currentRect.x + currentRect.width / 2,
            currentRect.y + currentRect.height / 2,
            currentRect.width / 2,
            0,
            Math.PI * 2,
          );
          ctx.strokeStyle = "var(--accent-primary)";
          ctx.lineWidth = 2;
          ctx.setLineDash([6, 4]);
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.fillStyle = "rgba(214, 168, 79, 0.15)";
          ctx.fill();
        } else {
          ctx.strokeStyle = "var(--accent-primary)";
          ctx.lineWidth = 2;
          ctx.setLineDash([6, 4]);
          ctx.strokeRect(currentRect.x, currentRect.y, currentRect.width, currentRect.height);
          ctx.setLineDash([]);
          ctx.fillStyle = "rgba(214, 168, 79, 0.15)";
          ctx.fillRect(currentRect.x, currentRect.y, currentRect.width, currentRect.height);
        }
      }

      // Zone borders for GM
      if (isGM) {
        for (const zone of fogZones) {
          if (zone.shape === "circle") {
            ctx.strokeStyle = "rgba(214, 168, 79, 0.5)";
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(
              zone.x + zone.width / 2,
              zone.y + zone.height / 2,
              zone.width / 2,
              0,
              Math.PI * 2,
            );
            ctx.stroke();
          } else {
            ctx.strokeStyle = "rgba(214, 168, 79, 0.5)";
            ctx.lineWidth = 1;
            ctx.strokeRect(zone.x, zone.y, zone.width, zone.height);
          }
        }
      }
    }
  }

  useEffect(() => {
    draw();
  }, [draw]);

  // ── Helper: find zone under a point (for eraser) ────────────────────────
  function findZoneAt(mx: number, my: number): FogZone | null {
    // Search from top (last drawn) to bottom (first drawn)
    for (let i = fogZones.length - 1; i >= 0; i--) {
      const zone = fogZones[i];
      if (zone.shape === "circle") {
        const cx = zone.x + zone.width / 2;
        const cy = zone.y + zone.height / 2;
        const r = zone.width / 2;
        const dist = Math.sqrt((mx - cx) ** 2 + (my - cy) ** 2);
        if (dist <= r) return zone;
      } else {
        if (
          mx >= zone.x &&
          mx <= zone.x + zone.width &&
          my >= zone.y &&
          my <= zone.y + zone.height
        ) {
          return zone;
        }
      }
    }
    return null;
  }

  // ── Mouse handlers ──────────────────────────────────────────────────────

  function handleMouseDown(e: ReactMouseEvent<HTMLCanvasElement>) {
    if (!fogInteractive) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / zoom;
    const y = (e.clientY - rect.top) / zoom;

    // Eraser mode: click to remove a zone
    if (eraseMode) {
      const hit = findZoneAt(x, y);
      if (hit) {
        const newZones = fogZones.filter((z) => z !== hit);
        onZonesChange(newZones);
      }
      return;
    }

    // Draw mode: start drawing a new reveal zone
    setStart({ x, y });
    setDrawing(true);
    setCurrentRect({ x, y, width: 0, height: 0 });
  }

  function handleMouseMove(e: ReactMouseEvent<HTMLCanvasElement>) {
    if (!drawing || !fogInteractive || eraseMode) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / zoom;
    const y = (e.clientY - rect.top) / zoom;

    if (circleMode) {
      const radius = Math.max(Math.abs(x - start.x), Math.abs(y - start.y));
      setCurrentRect({
        x: start.x - radius,
        y: start.y - radius,
        width: radius * 2,
        height: radius * 2,
        shape: "circle",
      });
    } else {
      setCurrentRect({
        x: Math.min(start.x, x),
        y: Math.min(start.y, y),
        width: Math.abs(x - start.x),
        height: Math.abs(y - start.y),
        shape: "rect",
      });
    }
  }

  function handleMouseUp() {
    if (!drawing || !isGM) return;
    setDrawing(false);
    if (currentRect && currentRect.width > 10 && currentRect.height > 10) {
      const newZone: FogZone = { ...currentRect };
      if (circleMode) newZone.shape = "circle";
      const newZones = [...fogZones, newZone];
      onZonesChange(newZones);
    }
    setCurrentRect(null);
  }

  if (!_sceneId) return null;

  const cursor = fogInteractive && eraseMode ? "pointer" : fogInteractive ? "crosshair" : "default";

  return (
    <div
      className="fog-layer-container"
      style={{
        width: sceneWidth || 1200,
        height: sceneHeight || 800,
        pointerEvents: "none",
      }}
    >
      <canvas
        ref={canvasRef}
        className="fog-canvas"
        style={{
          width: "100%",
          height: "100%",
          pointerEvents: fogInteractive ? "auto" : "none",
          cursor,
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      />
      {saveError && <span className="fog-save-error">{saveError}</span>}
    </div>
  );
}
