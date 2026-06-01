import { useEffect, useRef, useState } from "react";
import { FogLayer } from "./FogLayer";

const TOKEN_KEY = "dnd_access_token";

type PlayerScene = {
  id: string;
  name: string;
  width: number;
  height: number;
  grid_size: number;
  background_url: string | null;
  is_active: boolean;
};

type PlayerToken = {
  id: string;
  name: string;
  x: number;
  y: number;
  size: number;
  color: string;
};

type PlayerMapProps = {
  campaignId: string;
  token: string;
  wsRef: React.MutableRefObject<WebSocket | null>;
};

export function PlayerMap({ campaignId, token: authToken, wsRef }: PlayerMapProps) {
  const [scenes, setScenes] = useState<PlayerScene[]>([]);
  const [selectedScene, setSelectedScene] = useState<PlayerScene | null>(null);
  const [sceneTokens, setSceneTokens] = useState<PlayerToken[]>([]);
  const [sceneBgUrl, setSceneBgUrl] = useState<string>("");
  const [zoom, setZoom] = useState(1);
  const scrollRef = useRef<HTMLDivElement>(null);

  const zoomPercent = Math.round(zoom * 100);

  // ── Load scenes ────────────────────────────────────────────────────────
  async function loadScenes() {
    try {
      const res = await fetch(`/api/campaigns/${campaignId}/player/scenes`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (!res.ok) return;
      const data: PlayerScene[] = await res.json();
      setScenes(data);
      const active = data.find((s) => s.is_active) ?? data[0] ?? null;
      if (active && active.id !== selectedScene?.id) {
        setSelectedScene(active);
      } else if (!selectedScene && active) {
        setSelectedScene(active);
      }
    } catch { /* ignore */ }
  }

  // ── Load tokens ────────────────────────────────────────────────────────
  async function loadTokens(sceneId: string) {
    try {
      const res = await fetch(`/api/player/scenes/${sceneId}/tokens`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (!res.ok) return;
      setSceneTokens((await res.json()) as PlayerToken[]);
    } catch { /* ignore */ }
  }

  // ── Load background image ──────────────────────────────────────────────
  async function loadBackground(bgUrl: string) {
    try {
      const res = await fetch(bgUrl, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (!res.ok) return;
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      setSceneBgUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return objectUrl;
      });
    } catch { /* ignore */ }
  }

  // ── WebSocket listener ─────────────────────────────────────────────────
  useEffect(() => {
    const ws = wsRef.current;
    if (!ws) return;

    const handler = (event: MessageEvent) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.type === "session_changed") {
          if (payload.resource === "scene" || payload.resource === "token" || payload.resource === "fog") {
            void loadScenes().then(() => {
              if (selectedScene?.id) void loadTokens(selectedScene.id);
            });
          }
        }
      } catch { /* ignore */ }
    };

    ws.addEventListener("message", handler);
    return () => ws.removeEventListener("message", handler);
  }, [wsRef.current, selectedScene?.id, campaignId]);

  // ── Initial load ───────────────────────────────────────────────────────
  useEffect(() => { void loadScenes(); }, [campaignId]);

  useEffect(() => {
    if (selectedScene) {
      void loadTokens(selectedScene.id);
      if (selectedScene.background_url) {
        void loadBackground(selectedScene.background_url);
      } else {
        setSceneBgUrl((prev) => { if (prev) URL.revokeObjectURL(prev); return ""; });
      }
    }
  }, [selectedScene?.id]);

  // ── Render ─────────────────────────────────────────────────────────────
  if (!selectedScene) {
    return (
      <div className="empty-state compact-empty">
        <p>Aucune scène active. Le MJ n'a pas encore préparé de carte.</p>
      </div>
    );
  }

  return (
    <div className="player-map-shell">
      {/* Scene info bar */}
      <div className="player-map-toolbar">
        <strong>{selectedScene.name}</strong>
        <small>{selectedScene.width}×{selectedScene.height} · grille {selectedScene.grid_size}px</small>

        {scenes.length > 1 && (
          <select
            value={selectedScene.id}
            onChange={(e) => {
              const scene = scenes.find((s) => s.id === e.target.value);
              if (scene) setSelectedScene(scene);
            }}
          >
            {scenes.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        )}

        <div className="player-map-zoom">
          <button onClick={() => setZoom((z) => Math.max(0.3, z - 0.2))} type="button">−</button>
          <span>{zoomPercent}%</span>
          <button onClick={() => setZoom((z) => Math.min(3, z + 0.2))} type="button">+</button>
        </div>
      </div>

      {/* Map viewport */}
      <div className="player-map-viewport" ref={scrollRef}>
        <div
          className="player-map-surface"
          style={{
            width: selectedScene.width * zoom,
            height: selectedScene.height * zoom,
          }}
        >
          <div
            className="player-map-board"
            style={{
              width: selectedScene.width,
              height: selectedScene.height,
              backgroundSize: `${selectedScene.grid_size}px ${selectedScene.grid_size}px`,
              transform: `scale(${zoom})`,
            }}
          >
            {sceneBgUrl && (
              <img
                alt=""
                className="player-map-bg"
                src={sceneBgUrl}
                aria-hidden="true"
              />
            )}

            {/* Tokens (read-only) */}
            {sceneTokens.map((tok) => (
              <div
                key={tok.id}
                className="player-token"
                style={{
                  left: tok.x,
                  top: tok.y,
                  width: tok.size * selectedScene.grid_size,
                  height: tok.size * selectedScene.grid_size,
                  background: tok.color,
                }}
                title={tok.name}
              >
                {tok.name.slice(0, 2).toUpperCase()}
              </div>
            ))}

            {/* Fog of War — player view */}
            <FogLayer
              sceneId={selectedScene.id}
              sceneWidth={selectedScene.width}
              sceneHeight={selectedScene.height}
              isGM={false}
              zoom={zoom}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
