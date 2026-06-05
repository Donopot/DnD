import { useEffect, useRef } from "react";

export type WeatherType = "clear" | "rain" | "snow" | "fog" | "night";

interface WeatherLayerProps {
  type: WeatherType;
  intensity: number; // 0-100
  width: number;
  height: number;
  enabled: boolean;
}

interface Particle {
  x: number;
  y: number;
  speed: number;
  size: number;
  opacity: number;
  wind: number;
}

function createParticles(count: number, width: number, height: number): Particle[] {
  const particles: Particle[] = [];
  for (let i = 0; i < count; i++) {
    particles.push({
      x: Math.random() * width,
      y: Math.random() * height,
      speed: 1 + Math.random() * 3,
      size: 1 + Math.random() * 2,
      opacity: 0.3 + Math.random() * 0.5,
      wind: (Math.random() - 0.5) * 2,
    });
  }
  return particles;
}

export function WeatherLayer({ type, intensity, width, height, enabled }: WeatherLayerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!enabled || type === "clear") return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    const particles =
      type === "rain"
        ? createParticles(Math.floor(50 + intensity * 2), width, height)
        : type === "snow"
          ? createParticles(Math.floor(30 + intensity * 1.5), width, height)
          : type === "fog"
            ? createParticles(Math.floor(10 + intensity * 0.5), width, height)
            : [];

    const draw = () => {
      ctx.clearRect(0, 0, width, height);

      if (type === "rain") {
        ctx.strokeStyle = `rgba(174, 194, 224, ${0.15 + intensity * 0.004})`;
        ctx.lineWidth = 1.2;
        for (const p of particles) {
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x + p.wind, p.y + p.size * 5);
          ctx.stroke();
          p.y += p.speed * (1 + intensity * 0.02);
          p.x += p.wind * 0.5;
          if (p.y > height) {
            p.y = -10;
            p.x = Math.random() * width;
          }
        }
      } else if (type === "snow") {
        for (const p of particles) {
          ctx.fillStyle = `rgba(255, 255, 255, ${p.opacity * (intensity / 100)})`;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
          p.y += p.speed * 0.3;
          p.x += Math.sin(p.y * 0.02) * 0.3 + p.wind * 0.1;
          if (p.y > height) {
            p.y = -5;
            p.x = Math.random() * width;
          }
        }
      } else if (type === "fog") {
        for (const p of particles) {
          const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 80 + p.size * 30);
          gradient.addColorStop(0, `rgba(200, 210, 220, ${0.08 * (intensity / 100)})`);
          gradient.addColorStop(1, "rgba(200, 210, 220, 0)");
          ctx.fillStyle = gradient;
          ctx.beginPath();
          ctx.arc(p.x, p.y, 80 + p.size * 30, 0, Math.PI * 2);
          ctx.fill();
          p.x += p.wind * 0.15;
          if (p.x > width + 100) p.x = -100;
          if (p.x < -100) p.x = width + 100;
        }
      } else if (type === "night") {
        // Dark overlay with vignette
        const gradient = ctx.createRadialGradient(
          width / 2,
          height / 2,
          width * 0.2,
          width / 2,
          height / 2,
          width * 0.8,
        );
        gradient.addColorStop(0, `rgba(10, 15, 30, 0)`);
        gradient.addColorStop(0.5, `rgba(10, 15, 30, ${0.2 + intensity * 0.005})`);
        gradient.addColorStop(1, `rgba(10, 15, 30, ${0.4 + intensity * 0.006})`);
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);
      }

      animId = requestAnimationFrame(draw);
    };

    draw();
    return () => cancelAnimationFrame(animId);
  }, [type, intensity, width, height, enabled]);

  if (!enabled || type === "clear") return null;

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width,
        height,
        pointerEvents: "none",
        zIndex: 10,
      }}
    />
  );
}

// ─── Weather Controls (GM Panel) ────────────────────────────────────────

interface WeatherControlsProps {
  weather: WeatherType;
  intensity: number;
  enabled: boolean;
  onChange: (w: WeatherType, i: number, e: boolean) => void;
}

const WEATHER_OPTIONS: { type: WeatherType; label: string; emoji: string }[] = [
  { type: "clear", label: "Dégagé", emoji: "☀️" },
  { type: "rain", label: "Pluie", emoji: "🌧️" },
  { type: "snow", label: "Neige", emoji: "❄️" },
  { type: "fog", label: "Brouillard", emoji: "🌫️" },
  { type: "night", label: "Nuit", emoji: "🌙" },
];

export function WeatherControls({ weather, intensity, enabled, onChange }: WeatherControlsProps) {
  return (
    <div className="weather-controls">
      <div className="weather-toggle">
        <label>
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => onChange(weather, intensity, e.target.checked)}
          />
          <span>Effets météo</span>
        </label>
      </div>
      <div className="weather-options">
        {WEATHER_OPTIONS.map((w) => (
          <button
            key={w.type}
            className={`weather-btn ${weather === w.type ? "active" : ""}`}
            onClick={() => onChange(w.type, w.type === "clear" ? 0 : 50, true)}
            title={w.label}
          >
            {w.emoji}
          </button>
        ))}
      </div>
      {weather !== "clear" && enabled && (
        <div className="weather-slider">
          <span>Intensité</span>
          <input
            type="range"
            min={10}
            max={100}
            value={intensity}
            onChange={(e) => onChange(weather, Number(e.target.value), enabled)}
          />
          <span>{intensity}%</span>
        </div>
      )}
      <style>{`
        .weather-controls {
          padding: 8px; font-size: 12px;
        }
        .weather-toggle {
          margin-bottom: 6px;
        }
        .weather-toggle label {
          display: flex; align-items: center; gap: 6px;
          color: #ccc; cursor: pointer;
        }
        .weather-options {
          display: flex; gap: 4px; margin-bottom: 6px;
        }
        .weather-btn {
          background: var(--bg-input, #1c1c1c);
          border: 1px solid var(--border, #333);
          padding: 4px 8px; border-radius: 4px;
          font-size: 16px; cursor: pointer;
        }
        .weather-btn.active {
          background: #1f5f43; border-color: #1f5f43;
        }
        .weather-slider {
          display: flex; align-items: center; gap: 6px;
          color: #888;
        }
        .weather-slider input[type="range"] {
          flex: 1; accent-color: #1f5f43;
        }
      `}</style>
    </div>
  );
}
