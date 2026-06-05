import { Dice1, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { apiRequest } from "../api/client";

type DungeonData = {
  seed: number;
  theme: string;
  width: number;
  height: number;
  grid_size: number;
  rooms: { x: number; y: number; w: number; h: number }[];
  corridors: { x: number; y: number; w: number; h: number }[];
  doors: { x: number; y: number }[];
};

const THEMES: [string, string][] = [
  ["dungeon", "🏰 Donjon"],
  ["cave", "🕳️ Caverne"],
  ["temple", "⛪ Temple"],
  ["ruins", "🏚️ Ruines"],
];

const SIZES: [string, number, number][] = [
  ["Petit", 30, 24],
  ["Moyen", 50, 40],
  ["Grand", 70, 56],
  ["Énorme", 100, 80],
];

type DungeonGeneratorProps = {
  token: string;
  onUseAsScene?: (name: string, width: number, height: number) => void;
};

export function DungeonGenerator({ token }: DungeonGeneratorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [dungeon, setDungeon] = useState<DungeonData | null>(null);
  const [loading, setLoading] = useState(false);
  const [theme, setTheme] = useState("dungeon");
  const [sizeIdx, setSizeIdx] = useState(1);
  const [roomCount, setRoomCount] = useState(8);
  const [seed, setSeed] = useState<number>(0);

  const generate = useCallback(
    async (newSeed?: number) => {
      setLoading(true);
      try {
        const [w, h] = SIZES[sizeIdx].slice(1) as [number, number];
        const dungeon = await apiRequest<DungeonData>("/api/dungeon/generate", token, {
          method: "POST",
          body: JSON.stringify({
            width: w,
            height: h,
            room_count: roomCount,
            seed: newSeed ?? (seed || undefined),
            theme,
          }),
        });
        if (dungeon) {
          setDungeon(dungeon);
          if (!newSeed) setSeed(dungeon.seed);
        }
      } catch {
        /* ignore */
      } finally {
        setLoading(false);
      }
    },
    [token, sizeIdx, roomCount, theme, seed],
  );

  // Draw on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !dungeon) return;

    const gs = 8; // pixels per grid cell
    canvas.width = dungeon.width * gs;
    canvas.height = dungeon.height * gs;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Background
    ctx.fillStyle = "#0a0f14";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Corridors
    for (const c of dungeon.corridors) {
      ctx.fillStyle = "#2a3038";
      ctx.fillRect(c.x * gs, c.y * gs, c.w * gs, c.h * gs);
    }

    // Rooms
    for (const r of dungeon.rooms) {
      ctx.fillStyle = "#3a434e";
      ctx.fillRect(r.x * gs + 1, r.y * gs + 1, r.w * gs - 2, r.h * gs - 2);

      // Room border
      ctx.strokeStyle = "#5a6a7e";
      ctx.lineWidth = 1;
      ctx.strokeRect(r.x * gs + 1, r.y * gs + 1, r.w * gs - 2, r.h * gs - 2);

      // Room number
      const idx = dungeon.rooms.indexOf(r);
      ctx.fillStyle = "#8a9aae";
      ctx.font = `${Math.max(6, gs - 1)}px sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(String(idx + 1), (r.x + r.w / 2) * gs, (r.y + r.h / 2) * gs);
    }

    // Doors
    for (const d of dungeon.doors) {
      ctx.fillStyle = "#c5b358";
      ctx.beginPath();
      ctx.arc(d.x * gs, d.y * gs, 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }, [dungeon]);

  function randomize() {
    const newSeed = Math.floor(Math.random() * 99999);
    generate(newSeed);
  }

  const [w, h] = SIZES[sizeIdx].slice(1) as [number, number];

  return (
    <div className="dungeon-generator">
      {/* ── Controls ─────────────────────────────────────────── */}
      <div className="dungeon-controls">
        <div className="dungeon-control-row">
          <label>
            Taille
            <select value={sizeIdx} onChange={(e) => setSizeIdx(Number(e.target.value))}>
              {SIZES.map(([label], i) => (
                <option key={i} value={i}>
                  {label}
                </option>
              ))}
            </select>
          </label>

          <label>
            Thème
            <select value={theme} onChange={(e) => setTheme(e.target.value)}>
              {THEMES.map(([val, label]) => (
                <option key={val} value={val}>
                  {label}
                </option>
              ))}
            </select>
          </label>

          <label>
            Salles
            <input
              type="number"
              min={3}
              max={30}
              value={roomCount}
              onChange={(e) => setRoomCount(Number(e.target.value))}
            />
          </label>
        </div>

        <div className="dungeon-control-row">
          <button
            className="primary-button compact"
            onClick={() => generate()}
            disabled={loading}
            type="button"
          >
            <Dice1 size={14} /> Générer
          </button>
          <button className="ghost-button compact" onClick={randomize} type="button">
            <RefreshCw size={14} /> Aléatoire
          </button>
          {seed > 0 && <span className="dungeon-seed">Seed: {seed}</span>}
        </div>
      </div>

      {/* ── Map preview ──────────────────────────────────────── */}
      <div className="dungeon-preview">
        {dungeon ? (
          <div className="dungeon-canvas-wrapper">
            <canvas ref={canvasRef} />
            <p className="dungeon-info">
              {dungeon.rooms.length} salles · {w}×{h} cellules · Theme: {dungeon.theme}
            </p>
          </div>
        ) : (
          <div className="empty-state compact-empty">
            <Dice1 size={24} />
            <p>Clique sur Générer pour créer un donjon</p>
          </div>
        )}
      </div>
    </div>
  );
}
