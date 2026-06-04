import { Crosshair, Eraser, Eye, EyeOff, Grid3X3, Undo2 } from "lucide-react";
import type { Scene } from "../api/types";
import type { FogZone } from "./FogLayer";

export type MapToolbarProps = {
  scenes: Scene[];
  selectedSceneId: string;
  onSelectScene?: (sceneId: string) => void;
  onLoadSceneTokens?: (sceneId: string) => void;
  zoomPercent: number;
  zoomIn: (cx: number, cy: number) => void;
  zoomOut: (cx: number, cy: number) => void;
  scrollRef: React.RefObject<HTMLDivElement | null>;
  showGrid: boolean;
  setShowGrid: React.Dispatch<React.SetStateAction<boolean>>;
  recenter: () => void;
  panMode: boolean;
  setPanMode: React.Dispatch<React.SetStateAction<boolean>>;
  setFogDrawMode: React.Dispatch<React.SetStateAction<boolean>>;
  setFogEraseMode: React.Dispatch<React.SetStateAction<boolean>>;
  setFogDrawing: React.Dispatch<React.SetStateAction<boolean>>;
  setFogCurrentRect: React.Dispatch<React.SetStateAction<FogZone | null>>;
  isGM: boolean;
  showFog: boolean;
  setShowFog: React.Dispatch<React.SetStateAction<boolean>>;
  fogDrawMode: boolean;
  fogCircleMode: boolean;
  setFogCircleMode: React.Dispatch<React.SetStateAction<boolean>>;
  fogEraseMode: boolean;
  fogZones: FogZone[];
  saveFogZones: (zones: FogZone[]) => void;
  selectedSceneName: string;
};

export function MapToolbar({
  scenes,
  selectedSceneId,
  onSelectScene,
  onLoadSceneTokens,
  zoomPercent,
  zoomIn,
  zoomOut,
  scrollRef,
  showGrid,
  setShowGrid,
  recenter,
  panMode,
  setPanMode,
  setFogDrawMode,
  setFogEraseMode,
  setFogDrawing,
  setFogCurrentRect,
  isGM,
  showFog,
  setShowFog,
  fogDrawMode,
  fogCircleMode,
  setFogCircleMode,
  fogEraseMode,
  fogZones,
  saveFogZones,
  selectedSceneName,
}: MapToolbarProps) {
  const zoomCenter = () => {
    const rect = scrollRef.current?.getBoundingClientRect();
    if (rect) return { cx: rect.width / 2, cy: rect.height / 2 };
    return { cx: 0, cy: 0 };
  };

  return (
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

      {scenes.length <= 1 && <strong>{selectedSceneName}</strong>}

      <div className="campaign-map-zoom">
        <button
          type="button"
          onClick={() => {
            const { cx, cy } = zoomCenter();
            zoomOut(cx, cy);
          }}
          aria-label="Zoom arrière"
        >
          −
        </button>
        <span>{zoomPercent}%</span>
        <button
          type="button"
          onClick={() => {
            const { cx, cy } = zoomCenter();
            zoomIn(cx, cy);
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
        onClick={() => {
          setPanMode((prev) => {
            if (!prev) {
              // Disable fog draw/erase when entering pan mode
              setFogDrawMode(false);
              setFogEraseMode(false);
              setFogDrawing(false);
              setFogCurrentRect(null);
            }
            return !prev;
          });
        }}
      >
        {panMode ? "✋ Pan ON" : "✋ Pan"}
      </button>

      {/* Fog controls */}
      {isGM && (
        <>
          <button
            type="button"
            className={`campaign-map-grid-toggle ${showFog ? "active" : ""}`}
            onClick={() => {
              setShowFog((s) => {
                if (s) {
                  setFogDrawMode(false);
                  setFogEraseMode(false);
                }
                return !s;
              });
            }}
            title={showFog ? "Masquer le brouillard" : "Afficher le brouillard"}
          >
            {showFog ? <EyeOff size={14} /> : <Eye size={14} />}
            {showFog ? "Afficher fog" : "Masquer fog"}
          </button>
          {showFog && (
            <button
              type="button"
              className={`campaign-map-grid-toggle ${fogDrawMode && !fogEraseMode ? "active" : ""}`}
              onClick={() => {
                setFogDrawMode((m) => !m);
                setFogEraseMode(false);
              }}
              title="Dessiner le brouillard"
            >
              Draw
            </button>
          )}
          {showFog && (
            <button
              type="button"
              className={`campaign-map-grid-toggle ${fogCircleMode ? "active" : ""}`}
              onClick={() => setFogCircleMode((m) => !m)}
              title={fogCircleMode ? "Mode rectangle" : "Mode cercle"}
            >
              {fogCircleMode ? "◯" : "▭"}
            </button>
          )}
          {showFog && (
            <button
              type="button"
              className={`campaign-map-grid-toggle ${fogEraseMode ? "active" : ""}`}
              onClick={() => {
                setFogEraseMode((m) => !m);
                setFogDrawMode(false);
              }}
              title="Gomme (clic sur une zone pour l'effacer)"
            >
              <Eraser size={14} />
            </button>
          )}
          {fogZones.length > 0 && (
            <>
              <button
                type="button"
                className="campaign-map-grid-toggle"
                onClick={() => saveFogZones(fogZones.slice(0, -1))}
                title="Annuler dernière zone"
              >
                <Undo2 size={14} />
              </button>
              <button
                type="button"
                className="campaign-map-grid-toggle"
                onClick={() => saveFogZones([])}
                title="Reset tout le brouillard"
              >
                Reset
              </button>
            </>
          )}
        </>
      )}
    </div>
  );
}
