import {
  Circle,
  Crosshair,
  Eraser,
  Eye,
  EyeOff,
  Grid3X3,
  Hand,
  Minus,
  Plus,
  Square,
  Undo2,
} from "lucide-react";
import type { Scene } from "../api/types";
import type { FogZone } from "./FogLayer";
import { Tooltip } from "./Tooltip";

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

const BTN = "map-toolbar-btn";
const ACTIVE = " active";

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
    <div className="map-toolbar">
      {/* ── Scene selector ──────────────────────────────── */}
      <div className="map-toolbar-group">
        {scenes.length > 1 && onSelectScene ? (
          <select
            className="map-toolbar-scene"
            value={selectedSceneId}
            onChange={(e) => {
              onSelectScene(e.target.value);
              onLoadSceneTokens?.(e.target.value);
            }}
            aria-label="Scène"
          >
            {scenes.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        ) : (
          <span className="map-toolbar-scene-name">{selectedSceneName}</span>
        )}
      </div>

      {/* ── Navigation ──────────────────────────────────── */}
      <div className="map-toolbar-group">
        <Tooltip content="Zoom arrière">
          <button
            type="button"
            className={BTN}
            onClick={() => zoomOut(zoomCenter().cx, zoomCenter().cy)}
            aria-label="Zoom arrière"
          >
            <Minus size={16} />
          </button>
        </Tooltip>
        <span className="map-toolbar-zoom">{zoomPercent}%</span>
        <Tooltip content="Zoom avant">
          <button
            type="button"
            className={BTN}
            onClick={() => zoomIn(zoomCenter().cx, zoomCenter().cy)}
            aria-label="Zoom avant"
          >
            <Plus size={16} />
          </button>
        </Tooltip>
      </div>

      {/* ── View controls ──────────────────────────────── */}
      <div className="map-toolbar-group">
        <Tooltip content={showGrid ? "Masquer la grille" : "Afficher la grille"}>
          <button
            type="button"
            className={`${BTN}${showGrid ? ACTIVE : ""}`}
            onClick={() => setShowGrid((g) => !g)}
            aria-label={showGrid ? "Masquer la grille" : "Afficher la grille"}
          >
            <Grid3X3 size={16} />
          </button>
        </Tooltip>
        <Tooltip content="Recentrer la scène">
          <button type="button" className={BTN} onClick={recenter} aria-label="Recentrer la scène">
            <Crosshair size={16} />
          </button>
        </Tooltip>
        <Tooltip content={panMode ? "Mode déplacement actif" : "Mode déplacement"}>
          <button
            type="button"
            className={`${BTN}${panMode ? ACTIVE : ""}`}
            onClick={() => {
              setPanMode((prev) => {
                if (!prev) {
                  setFogDrawMode(false);
                  setFogEraseMode(false);
                  setFogDrawing(false);
                  setFogCurrentRect(null);
                }
                return !prev;
              });
            }}
            aria-label={panMode ? "Désactiver le déplacement" : "Activer le déplacement"}
          >
            <Hand size={16} />
          </button>
        </Tooltip>
      </div>

      {/* ── Fog of War (GM only) ───────────────────────── */}
      {isGM && (
        <div className="map-toolbar-group">
          <Tooltip content={showFog ? "Masquer le brouillard" : "Afficher le brouillard"}>
            <button
              type="button"
              className={`${BTN}${showFog ? ACTIVE : ""}`}
              onClick={() => {
                setShowFog((s) => {
                  if (s) {
                    setFogDrawMode(false);
                    setFogEraseMode(false);
                  }
                  return !s;
                });
              }}
              aria-label={showFog ? "Masquer le brouillard" : "Afficher le brouillard"}
            >
              {showFog ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </Tooltip>

          {showFog && (
            <>
              <div className="map-toolbar-sep" />

              <Tooltip content="Dessiner le brouillard (rectangle)">
                <button
                  type="button"
                  className={`${BTN}${fogDrawMode && !fogCircleMode ? ACTIVE : ""}`}
                  onClick={() => {
                    setFogDrawMode((m) => !m);
                    setFogEraseMode(false);
                  }}
                  aria-label="Dessiner le brouillard"
                >
                  <Square size={16} />
                </button>
              </Tooltip>
              <Tooltip content={fogCircleMode ? "Mode rectangle" : "Mode cercle"}>
                <button
                  type="button"
                  className={`${BTN}${fogCircleMode ? ACTIVE : ""}`}
                  onClick={() => setFogCircleMode((m) => !m)}
                  aria-label={fogCircleMode ? "Passer en mode rectangle" : "Passer en mode cercle"}
                >
                  <Circle size={16} />
                </button>
              </Tooltip>
              <Tooltip content="Gomme (clic pour effacer une zone)">
                <button
                  type="button"
                  className={`${BTN}${fogEraseMode ? ACTIVE : ""}`}
                  onClick={() => {
                    setFogEraseMode((m) => !m);
                    setFogDrawMode(false);
                  }}
                  aria-label="Gomme brouillard"
                >
                  <Eraser size={16} />
                </button>
              </Tooltip>

              {fogZones.length > 0 && (
                <>
                  <div className="map-toolbar-sep" />
                  <Tooltip content="Annuler la dernière zone">
                    <button
                      type="button"
                      className={BTN}
                      onClick={() => saveFogZones(fogZones.slice(0, -1))}
                      aria-label="Annuler dernière zone"
                    >
                      <Undo2 size={16} />
                    </button>
                  </Tooltip>
                  <Tooltip content="Effacer tout le brouillard">
                    <button
                      type="button"
                      className={`${BTN} danger`}
                      onClick={() => saveFogZones([])}
                      aria-label="Effacer tout le brouillard"
                    >
                      <Eraser size={16} />
                    </button>
                  </Tooltip>
                </>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
