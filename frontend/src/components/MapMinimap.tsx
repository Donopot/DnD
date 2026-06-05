import { useEffect, useRef } from "react";
import type { Scene, SceneToken } from "../api/types";
import type { FogZone } from "./FogLayer";

export type MapMinimapProps = {
  selectedScene: Scene;
  sceneTokens: SceneToken[];
  zoom: number;
  fogZones: FogZone[];
  isGM: boolean;
  gridSize: number;
  isInFogZone: (px: number, py: number, zone: FogZone) => boolean;
  /** Ref to the map viewport scroll container (to render viewport rect). */
  scrollRef: React.RefObject<HTMLDivElement | null>;
};

export function MapMinimap({
  selectedScene,
  sceneTokens,
  zoom,
  fogZones,
  isGM,
  gridSize,
  isInFogZone,
  scrollRef,
}: MapMinimapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

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
        const revealed = fogZones.some((z) => isInFogZone(tc, ty, z));
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
  }, [selectedScene, sceneTokens, zoom, fogZones, isGM, gridSize, isInFogZone, scrollRef]);

  return <canvas ref={canvasRef} className="campaign-map-minimap" width={160} height={120} />;
}
