import { useEffect, useRef, useState } from "react";

/* ─── Types ──────────────────────────────────────────────────────────── */

type PlaylistName =
  | "tavern"
  | "dungeon"
  | "forest"
  | "combat"
  | "mystery"
  | "town"
  | "storm"
  | "temple"
  | "boss";

interface Playlist {
  name: PlaylistName;
  label: string;
  emoji: string;
  url: string; // YouTube audio stream or local file
}

/* ─── Playlists (placeholder URLs — users can replace with their own) ── */

const PLAYLISTS: Playlist[] = [
  { name: "tavern", label: "Taverne", emoji: "🍺", url: "" },
  { name: "dungeon", label: "Donjon", emoji: "🏚️", url: "" },
  { name: "forest", label: "Forêt", emoji: "🌲", url: "" },
  { name: "combat", label: "Combat", emoji: "⚔️", url: "" },
  { name: "mystery", label: "Mystère", emoji: "🔮", url: "" },
  { name: "town", label: "Ville", emoji: "🏘️", url: "" },
  { name: "storm", label: "Tempête", emoji: "⛈️", url: "" },
  { name: "temple", label: "Temple", emoji: "⛪", url: "" },
  { name: "boss", label: "Boss", emoji: "🐉", url: "" },
];

/* ─── Component ──────────────────────────────────────────────────────── */

interface AmbiancePanelProps {
  isGM: boolean;
}

export function AmbiancePanel({ isGM }: AmbiancePanelProps) {
  const [active, setActive] = useState<PlaylistName | null>(null);
  const [volume, setVolume] = useState(50);
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Initialize audio element
  useEffect(() => {
    const audio = new Audio();
    audio.loop = true;
    audio.volume = volume / 100;
    audioRef.current = audio;
    return () => {
      audio.pause();
      audio.src = "";
    };
  }, []);

  // Update volume
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume / 100;
    }
  }, [volume]);

  const selectPlaylist = (name: PlaylistName) => {
    const playlist = PLAYLISTS.find((p) => p.name === name);
    if (!playlist) return;

    if (active === name && playing) {
      // Stop current
      audioRef.current?.pause();
      setPlaying(false);
      return;
    }

    setActive(name);

    // Note: in production, use real audio URLs.
    // For now, generate a simple ambient tone using Web Audio API
    if (playlist.url) {
      if (audioRef.current) {
        audioRef.current.src = playlist.url;
        audioRef.current.play().catch(() => {});
      }
    } else {
      // Play a soft noise using Web Audio API as placeholder
      playAmbientNoise(playing);
    }
    setPlaying(true);
    setActive(name);
  };

  const stopAll = () => {
    audioRef.current?.pause();
    setPlaying(false);
    setActive(null);
  };

  return (
    <div className="ambiance-panel">
      {!isGM && (
        <div className="ambiance-info">
          <p>🎵 Le MJ contrôle l'ambiance sonore.</p>
        </div>
      )}

      {isGM && (
        <>
          <div className="ambiance-controls">
            <div className="ambiance-volume">
              <span>🔈</span>
              <input
                type="range"
                min={0}
                max={100}
                value={volume}
                onChange={(e) => setVolume(Number(e.target.value))}
              />
              <span>🔊</span>
            </div>
            {active && playing && (
              <button className="ambiance-stop-btn" onClick={stopAll}>
                ⏹️ Stop
              </button>
            )}
          </div>
          <div className="ambiance-grid">
            {PLAYLISTS.map((p) => (
              <button
                key={p.name}
                className={`ambiance-btn ${active === p.name && playing ? "active" : ""}`}
                onClick={() => selectPlaylist(p.name)}
                title={p.label}
              >
                <span className="ambiance-emoji">{p.emoji}</span>
                <span className="ambiance-label">{p.label}</span>
                {active === p.name && playing && <span className="ambiance-playing-indicator" />}
              </button>
            ))}
          </div>
          {active && playing && (
            <div className="ambiance-status">
              ▶️ En cours : {PLAYLISTS.find((p) => p.name === active)?.emoji}{" "}
              {PLAYLISTS.find((p) => p.name === active)?.label}
            </div>
          )}
          <div className="ambiance-hint">
            💡 Ajoutez vos propres pistes audio dans <code>public/audio/</code> ou utilisez des
            liens YouTube/Spotify.
          </div>
        </>
      )}

      <style>{`
        .ambiance-panel {
          padding: 8px; font-size: 13px;
          color: #ccc;
        }
        .ambiance-info {
          text-align: center; padding: 20px; color: #888;
        }
        .ambiance-controls {
          display: flex; align-items: center; gap: 8px;
          margin-bottom: 10px;
        }
        .ambiance-volume {
          flex: 1; display: flex; align-items: center; gap: 6px;
        }
        .ambiance-volume input[type="range"] {
          flex: 1; accent-color: #1f5f43;
        }
        .ambiance-stop-btn {
          background: #5c1a1a; border: none; color: #fff;
          padding: 4px 10px; border-radius: 4px; font-size: 13px;
          cursor: pointer;
        }
        .ambiance-grid {
          display: grid; grid-template-columns: repeat(3, 1fr);
          gap: 6px;
        }
        .ambiance-btn {
          display: flex; flex-direction: column; align-items: center;
          gap: 2px; padding: 10px 6px;
          background: var(--bg-input, #1c1c1c);
          border: 1px solid var(--border, #333);
          border-radius: 8px; cursor: pointer; position: relative;
        }
        .ambiance-btn:hover {
          background: #2a3a30; border-color: #1f5f43;
        }
        .ambiance-btn.active {
          background: #1f5f43; border-color: #267a55;
        }
        .ambiance-emoji { font-size: 22px; }
        .ambiance-label { font-size: 11px; color: #aaa; }
        .ambiance-btn.active .ambiance-label { color: #ddd; }
        .ambiance-playing-indicator {
          position: absolute; top: 4px; right: 4px;
          width: 6px; height: 6px; background: #22c55e;
          border-radius: 50%;
          animation: ambiance-pulse 1s ease-in-out infinite;
        }
        @keyframes ambiance-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
        .ambiance-status {
          margin-top: 10px; padding: 6px 8px;
          background: rgba(31,95,67,0.15); border-radius: 6px;
          font-size: 12px; color: #7eb89a;
        }
        .ambiance-hint {
          margin-top: 8px; font-size: 11px; color: #555;
          line-height: 1.4;
        }
        .ambiance-hint code {
          background: rgba(255,255,255,0.05);
          padding: 1px 4px; border-radius: 3px;
        }
      `}</style>
    </div>
  );
}

/* ─── Placeholder noise generator ────────────────────────────────────── */

let noiseCtx: AudioContext | null = null;
let noiseSource: AudioBufferSourceNode | null = null;

function playAmbientNoise(stop: boolean) {
  if (stop) {
    noiseSource?.stop();
    noiseSource = null;
    return;
  }

  if (!noiseCtx) {
    noiseCtx = new AudioContext();
  }

  // Generate brown noise (softer, more atmospheric)
  const bufferSize = noiseCtx.sampleRate * 2;
  const buffer = noiseCtx.createBuffer(1, bufferSize, noiseCtx.sampleRate);
  const data = buffer.getChannelData(0);
  let lastOut = 0;
  for (let i = 0; i < bufferSize; i++) {
    const white = Math.random() * 2 - 1;
    data[i] = (lastOut + 0.02 * white) / 1.02;
    lastOut = data[i];
  }

  const source = noiseCtx.createBufferSource();
  source.buffer = buffer;
  source.loop = true;

  const gain = noiseCtx.createGain();
  gain.gain.value = 0.04; // very soft
  source.connect(gain);
  gain.connect(noiseCtx.destination);

  source.start();
  noiseSource = source;
}
