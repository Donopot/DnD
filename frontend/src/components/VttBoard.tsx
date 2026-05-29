import {
  type ChangeEvent,
  type FormEvent,
  type MouseEvent,
  type PointerEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Castle, Crosshair, Minus, Plus, RotateCcw, Swords } from "lucide-react";

import type { Asset, Character, Scene, SceneToken } from "../api/types";
import type { FloatingWidgetPreset, VttPanelId } from "../config/vttPanels";
import {
  applyFloatingWidgetPreset,
  resetFloatingWidgetLayouts,
  saveFloatingWidgetCustomPreset,
  showFloatingWidget,
  useFloatingWidgets,
} from "../hooks/useFloatingWidgets";
import { InitiativePanel } from "./InitiativePanel";
import { QuickActionsPanel } from "./QuickActionsPanel";
import { VisibilityInspectorPanel } from "./VisibilityInspectorPanel";
import { VttPanelsMenu } from "./VttPanelsMenu";

type SessionLiveMode = "exploration" | "combat" | "roleplay" | "quick-prep" | "minimal";

function getPresetForSessionLiveMode(mode: SessionLiveMode): FloatingWidgetPreset {
  if (mode === "quick-prep") {
    return "quick-prep";
  }

  return mode;
}

type Position = {
  x: number;
  y: number;
};

type GmInterfaceMode = "play" | "prepare" | "advanced";

type VttBoardProps = {
  scenes: Scene[];
  selectedScene: Scene | undefined;
  selectedSceneId: string;
  sceneTokens: SceneToken[];
  characters: Character[];
  selectedCharacter: Character | undefined;
  assets: Asset[];
  selectedAssetId: string;
  sceneBackgroundObjectUrl: string;
  isBusy: boolean;
  onSelectScene: (sceneId: string) => void;
  onLoadSceneTokens: (sceneId: string) => void;
  onCreateScene: (event: FormEvent<HTMLFormElement>) => void;
  onUploadAsset: (event: FormEvent<HTMLFormElement>) => void;
  onSelectAsset: (assetId: string) => void;
  onSetSceneBackground: () => void;
  onCreateToken: (event: FormEvent<HTMLFormElement>) => void;
  onMoveToken: (token: SceneToken, dx: number, dy: number) => void;
  sessionLiveMode?: SessionLiveMode;
};

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function getAbilityModifier(value: number) {
  return Math.floor((value - 10) / 2);
}

function getPassivePerception(character: Character) {
  return 10 + getAbilityModifier(character.attributes.wis ?? 10);
}

function getHpPercent(character: Character) {
  if (character.hp_max <= 0) {
    return 0;
  }

  return Math.max(0, Math.min(100, Math.round((character.hp_current / character.hp_max) * 100)));
}

export function VttBoard({
  scenes,
  selectedScene,
  sceneTokens,
  characters,
  selectedCharacter,
  assets,
  selectedAssetId,
  sceneBackgroundObjectUrl,
  isBusy,
  onSelectScene,
  onLoadSceneTokens,
  onCreateScene,
  onUploadAsset,
  onSelectAsset,
  onSetSceneBackground,
  onCreateToken,
  onMoveToken,
  sessionLiveMode,
}: VttBoardProps) {
  const boardRef = useRef<HTMLDivElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const panStartRef = useRef<Position>({ x: 0, y: 0 });
  const panOriginRef = useRef<Position>({ x: 0, y: 0 });
  const [selectedTokenId, setSelectedTokenId] = useState<string>("");
  const [dragTokenId, setDragTokenId] = useState<string>("");
  const [draftPositions, setDraftPositions] = useState<Record<string, Position>>({});
  const [snapToGrid, setSnapToGrid] = useState(true);
  const [panMode, setPanMode] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [gmNotes, setGmNotes] = useState("");
  const [freePanelsEnabled, setFreePanelsEnabled] = useState(false);
  const [gmInterfaceMode, setGmInterfaceMode] = useState<GmInterfaceMode>("play");
  const [viewportRatio, setViewportRatio] = useState({
    left: 0,
    top: 0,
    width: 1,
    height: 1,
  });

  const selectedToken = useMemo(
    () => sceneTokens.find((token) => token.id === selectedTokenId),
    [sceneTokens, selectedTokenId],
  );

  const selectedTokenCharacter = useMemo(() => {
    if (!selectedToken?.character_id) {
      return undefined;
    }

    return characters.find((character) => character.id === selectedToken.character_id);
  }, [characters, selectedToken]);

  const selectedTokenPosition = selectedToken
    ? draftPositions[selectedToken.id] ?? { x: selectedToken.x, y: selectedToken.y }
    : undefined;

  const effectiveFreePanelsEnabled = freePanelsEnabled || gmInterfaceMode === "advanced";

  useFloatingWidgets(effectiveFreePanelsEnabled, ".vtt-control-panel", selectedScene?.id ?? "no-scene");

  const zoomPercent = Math.round(zoom * 100);

  useEffect(() => {
    if (!selectedScene) {
      setGmNotes("");
      return;
    }

    const scene = selectedScene;
    const savedNotes = window.localStorage.getItem(`dnd-gm-scene-notes:${scene.id}`) ?? "";

    setGmNotes(savedNotes);
  }, [selectedScene?.id]);

  function handleGmNotesChange(event: ChangeEvent<HTMLTextAreaElement>) {
    const nextValue = event.target.value;

    setGmNotes(nextValue);

    if (!selectedScene) {
      return;
    }

    const scene = selectedScene;

    window.localStorage.setItem(`dnd-gm-scene-notes:${scene.id}`, nextValue);
  }

  useEffect(() => {
    if (!sessionLiveMode) {
      return;
    }

    const sessionLiveModePreset = getPresetForSessionLiveMode(sessionLiveMode);

    setGmMode("advanced");

    window.setTimeout(() => {
      applyFloatingWidgetPreset(sessionLiveModePreset);
    }, 100);
  }, [sessionLiveMode, selectedScene?.id]);

  function getTokenPositionFromPointer(event: PointerEvent<HTMLDivElement>, token: SceneToken): Position | null {
    if (!selectedScene || !boardRef.current) {
      return null;
    }

    const rect = boardRef.current.getBoundingClientRect();
    const rawX = (event.clientX - rect.left) / zoom;
    const rawY = (event.clientY - rect.top) / zoom;
    const tokenWidth = token.size * selectedScene.grid_size;
    const maxX = Math.max(0, selectedScene.width - tokenWidth);
    const maxY = Math.max(0, selectedScene.height - tokenWidth);

    const x = snapToGrid
      ? Math.round(rawX / selectedScene.grid_size) * selectedScene.grid_size
      : Math.round(rawX);
    const y = snapToGrid
      ? Math.round(rawY / selectedScene.grid_size) * selectedScene.grid_size
      : Math.round(rawY);

    return {
      x: clamp(x, 0, maxX),
      y: clamp(y, 0, maxY),
    };
  }

  function handleTokenPointerDown(event: PointerEvent<HTMLButtonElement>, token: SceneToken) {
    event.preventDefault();
    event.stopPropagation();

    setSelectedTokenId(token.id);
    setDragTokenId(token.id);
    setDraftPositions((current) => ({
      ...current,
      [token.id]: { x: token.x, y: token.y },
    }));
  }

  function handleBoardPointerMove(event: PointerEvent<HTMLDivElement>) {
    if (!dragTokenId) {
      return;
    }

    const token = sceneTokens.find((item) => item.id === dragTokenId);
    if (!token) {
      return;
    }

    const position = getTokenPositionFromPointer(event, token);
    if (!position) {
      return;
    }

    setDraftPositions((current) => ({
      ...current,
      [token.id]: position,
    }));
  }

  function handleBoardPointerUp(event: PointerEvent<HTMLDivElement>) {
    if (!dragTokenId) {
      return;
    }

    const token = sceneTokens.find((item) => item.id === dragTokenId);
    if (!token) {
      setDragTokenId("");
      return;
    }

    const position = getTokenPositionFromPointer(event, token) ?? draftPositions[token.id];

    if (position) {
      const dx = position.x - token.x;
      const dy = position.y - token.y;

      if (dx !== 0 || dy !== 0) {
        onMoveToken(token, dx, dy);
      }
    }

    setDraftPositions((current) => {
      const next = { ...current };
      delete next[token.id];
      return next;
    });
    setDragTokenId("");
  }

  function updateZoom(delta: number) {
    setZoom((current) => clamp(Number((current + delta).toFixed(2)), 0.5, 2));
  }

  function setGmMode(mode: GmInterfaceMode) {
    setGmInterfaceMode(mode);

    if (mode === "advanced") {
      setFreePanelsEnabled(true);
    }

    if (mode !== "advanced") {
      setFreePanelsEnabled(false);
    }
  }

  function handleApplyFloatingPreset(preset: FloatingWidgetPreset) {
    setGmMode("advanced");

    window.setTimeout(() => {
      applyFloatingWidgetPreset(preset);
    }, 80);
  }

  function openGmPanel(panelId: string, targetMode: GmInterfaceMode = "prepare") {
    if (gmInterfaceMode !== "advanced") {
      setGmMode(targetMode);
      return;
    }

    showFloatingWidget(panelId);
  }

  function handleShowFloatingPanel(panelId: string) {
    setGmMode("advanced");

    window.setTimeout(() => {
      showFloatingWidget(panelId);
    }, 80);
  }

  function centerMapView(nextZoom = zoom) {
    if (!scrollRef.current || !selectedScene) {
      return;
    }

    window.requestAnimationFrame(() => {
      if (!scrollRef.current) {
        return;
      }

      const targetX = (selectedScene.width * nextZoom - scrollRef.current.clientWidth) / 2;
      const targetY = (selectedScene.height * nextZoom - scrollRef.current.clientHeight) / 2;

      scrollRef.current.scrollLeft = Math.max(0, targetX);
      scrollRef.current.scrollTop = Math.max(0, targetY);
    });
  }

  function resetMapView() {
    setZoom(1);
    setPanMode(false);
    centerMapView(1);
  }

  useEffect(() => {
    centerMapView();
  }, [selectedScene?.id]);

  useEffect(() => {
    const scrollElement = scrollRef.current;

    if (!scrollElement || !selectedScene) {
      setViewportRatio({
        left: 0,
        top: 0,
        width: 1,
        height: 1,
      });
      return;
    }

    const element = scrollElement;
    const scene = selectedScene;

    function updateViewportRatio() {
      const visibleWorldWidth = element.clientWidth / zoom;
      const visibleWorldHeight = element.clientHeight / zoom;

      const width = clamp(visibleWorldWidth / scene.width, 0.04, 1);
      const height = clamp(visibleWorldHeight / scene.height, 0.04, 1);

      setViewportRatio({
        left: clamp((element.scrollLeft / zoom) / scene.width, 0, Math.max(0, 1 - width)),
        top: clamp((element.scrollTop / zoom) / scene.height, 0, Math.max(0, 1 - height)),
        width,
        height,
      });
    }

    updateViewportRatio();

    element.addEventListener("scroll", updateViewportRatio);
    window.addEventListener("resize", updateViewportRatio);

    return () => {
      element.removeEventListener("scroll", updateViewportRatio);
      window.removeEventListener("resize", updateViewportRatio);
    };
  }, [selectedScene, zoom]);

  function centerMapFromOverview(event: MouseEvent<HTMLButtonElement>) {
    if (!selectedScene || !scrollRef.current) {
      return;
    }

    const rect = event.currentTarget.getBoundingClientRect();
    const ratioX = clamp((event.clientX - rect.left) / Math.max(1, rect.width), 0, 1);
    const ratioY = clamp((event.clientY - rect.top) / Math.max(1, rect.height), 0, 1);

    const targetX = selectedScene.width * zoom * ratioX;
    const targetY = selectedScene.height * zoom * ratioY;

    scrollRef.current.scrollLeft = clamp(
      targetX - scrollRef.current.clientWidth / 2,
      0,
      Math.max(0, scrollRef.current.scrollWidth - scrollRef.current.clientWidth),
    );

    scrollRef.current.scrollTop = clamp(
      targetY - scrollRef.current.clientHeight / 2,
      0,
      Math.max(0, scrollRef.current.scrollHeight - scrollRef.current.clientHeight),
    );
  }

  function centerSelectedToken() {
    if (!scrollRef.current || !selectedScene || !selectedToken || !selectedTokenPosition) {
      return;
    }

    const tokenSize = selectedToken.size * selectedScene.grid_size;
    const tokenCenterX = (selectedTokenPosition.x + tokenSize / 2) * zoom;
    const tokenCenterY = (selectedTokenPosition.y + tokenSize / 2) * zoom;

    scrollRef.current.scrollLeft = clamp(
      tokenCenterX - scrollRef.current.clientWidth / 2,
      0,
      Math.max(0, scrollRef.current.scrollWidth - scrollRef.current.clientWidth),
    );

    scrollRef.current.scrollTop = clamp(
      tokenCenterY - scrollRef.current.clientHeight / 2,
      0,
      Math.max(0, scrollRef.current.scrollHeight - scrollRef.current.clientHeight),
    );
  }

  function nudgeSelectedToken(dx: number, dy: number) {
    if (!selectedToken) {
      return;
    }

    onMoveToken(selectedToken, dx, dy);
  }

  function handlePanPointerDown(event: PointerEvent<HTMLDivElement>) {
    if (!panMode || dragTokenId || event.button !== 0 || !scrollRef.current) {
      return;
    }

    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    setIsPanning(true);

    panStartRef.current = { x: event.clientX, y: event.clientY };
    panOriginRef.current = {
      x: scrollRef.current.scrollLeft,
      y: scrollRef.current.scrollTop,
    };
  }

  function handlePanPointerMove(event: PointerEvent<HTMLDivElement>) {
    if (!isPanning || !scrollRef.current) {
      return;
    }

    const deltaX = event.clientX - panStartRef.current.x;
    const deltaY = event.clientY - panStartRef.current.y;

    scrollRef.current.scrollLeft = panOriginRef.current.x - deltaX;
    scrollRef.current.scrollTop = panOriginRef.current.y - deltaY;
  }

  function handlePanPointerUp(event: PointerEvent<HTMLDivElement>) {
    if (!isPanning) {
      return;
    }

    event.currentTarget.releasePointerCapture(event.pointerId);
    setIsPanning(false);
  }

  return (
    <div className={`vtt-section gm-mode-${gmInterfaceMode}`}>
      <div className="section-heading">
        <h3>Carte de session</h3>
        <Swords aria-hidden="true" />
      </div>

      <section className="gm-cockpit" aria-label="Cockpit MJ">
        <div className="gm-cockpit-main">
          <span className="gm-cockpit-label">Cockpit MJ</span>
          <strong>{selectedScene?.name ?? "Aucune scene active"}</strong>
          <small>
            {selectedScene
              ? `${selectedScene.width} x ${selectedScene.height} · grille ${selectedScene.grid_size}px`
              : "Cree ou selectionne une scene"}
          </small>
        </div>

        <div className="gm-cockpit-stats">
          <span>
            <small>Mode</small>
            <strong>
              {gmInterfaceMode === "play"
                ? "Partie"
                : gmInterfaceMode === "prepare"
                  ? "Preparation"
                  : "Avance"}
            </strong>
          </span>

          <span>
            <small>Tokens</small>
            <strong>{sceneTokens.length}</strong>
          </span>

          <span>
            <small>Selection</small>
            <strong>{selectedToken?.name ?? "Aucune"}</strong>
          </span>

          <span>
            <small>Zoom</small>
            <strong>{zoomPercent}%</strong>
          </span>
        </div>

        <div className="gm-cockpit-actions">
          <button type="button" onClick={() => centerMapView()}>
            Centrer carte
          </button>

          <button type="button" onClick={() => openGmPanel("token", "prepare")}>
            Ajouter token
          </button>

          <button type="button" onClick={() => openGmPanel("scene", "prepare")}>
            Scene
          </button>

          <button type="button" onClick={() => setGmMode("play")}>
            Mode partie
          </button>

          <button type="button" onClick={() => setGmMode("advanced")}>
            Avance
          </button>
        </div>
      </section>

      <div className="vtt-layout">
        <section className="vtt-board-panel">
          <div className="vtt-toolbar">
            <div>
              <strong>{selectedScene?.name ?? "Aucune scene"}</strong>
              {selectedScene && (
                <small>
                  {selectedScene.width} x {selectedScene.height} - grille {selectedScene.grid_size}px
                </small>
              )}
            </div>

            {scenes.length > 1 && (
              <select
                value={selectedScene?.id ?? ""}
                onChange={(event) => {
                  onSelectScene(event.target.value);
                  onLoadSceneTokens(event.target.value);
                }}
              >
                {scenes.map((scene) => (
                  <option key={scene.id} value={scene.id}>
                    {scene.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="map-ux-toolbar">
            <div className="gm-mode-switch" aria-label="Mode MJ">
              <button
                className={gmInterfaceMode === "play" ? "active" : ""}
                type="button"
                onClick={() => setGmMode("play")}
              >
                Partie
              </button>
              <button
                className={gmInterfaceMode === "prepare" ? "active" : ""}
                type="button"
                onClick={() => setGmMode("prepare")}
              >
                Preparation
              </button>
              <button
                className={gmInterfaceMode === "advanced" ? "active" : ""}
                type="button"
                onClick={() => setGmMode("advanced")}
              >
                Avance
              </button>
            </div>

            <div className="map-zoom-controls">
              <button type="button" onClick={() => updateZoom(-0.1)} aria-label="Reduire le zoom">
                <Minus aria-hidden="true" />
              </button>
              <strong>{zoomPercent}%</strong>
              <button type="button" onClick={() => updateZoom(0.1)} aria-label="Augmenter le zoom">
                <Plus aria-hidden="true" />
              </button>
            </div>

            <button
              className={`snap-toggle ${snapToGrid ? "active" : ""}`}
              type="button"
              aria-pressed={snapToGrid}
              onClick={() => setSnapToGrid((current) => !current)}
            >
              <Crosshair aria-hidden="true" />
              Snap grille
            </button>

            <button
              className={`pan-toggle ${panMode ? "active" : ""}`}
              type="button"
              aria-pressed={panMode}
              onClick={() => setPanMode((current) => !current)}
            >
              Pan carte
            </button>

            <button className="reset-map-button" type="button" onClick={resetMapView}>
              <RotateCcw aria-hidden="true" />
              Reset carte carte
            </button>

            <button
              className={`floating-toggle ${effectiveFreePanelsEnabled ? "active" : ""}`}
              type="button"
              aria-pressed={effectiveFreePanelsEnabled}
              onClick={() => setGmMode(effectiveFreePanelsEnabled ? "play" : "advanced")}
            >
              Panneaux libres
            </button>

            <VttPanelsMenu
              enabled={effectiveFreePanelsEnabled}
              onShowPanel={handleShowFloatingPanel}
              onApplyPreset={handleApplyFloatingPreset}
              onSaveCustomPreset={saveFloatingWidgetCustomPreset}
              onResetPanels={resetFloatingWidgetLayouts}
            />

            {selectedToken ? (
              <div className="selected-token-card">
                <span>Token actif</span>
                <strong>{selectedToken.name}</strong>
                <small>
                  x {selectedToken.x} · y {selectedToken.y}
                </small>
              </div>
            ) : (
              <p className="muted compact-help">Clique un token pour le selectionner. Glisse-le pour le deplacer.</p>
            )}

            <details className="keyboard-help">
              <summary>Raccourcis</summary>
              <div>
                <kbd>↑</kbd><kbd>↓</kbd><kbd>←</kbd><kbd>→</kbd>
                <span>Deplacer token</span>
              </div>
              <div>
                <kbd>+</kbd><kbd>-</kbd><kbd>0</kbd>
                <span>Zoom / reset</span>
              </div>
              <div>
                <kbd>Espace</kbd><kbd>G</kbd><kbd>Esc</kbd>
                <span>Pan / snap / quitter</span>
              </div>
            </details>
          </div>



          {selectedScene ? (
            <div
              ref={scrollRef}
              className={`map-scroll ${panMode ? "pan-mode" : ""} ${isPanning ? "panning" : ""}`}
              onPointerDown={handlePanPointerDown}
              onPointerMove={handlePanPointerMove}
              onPointerUp={handlePanPointerUp}
              onPointerCancel={handlePanPointerUp}
            >
              <div
                className="map-zoom-surface"
                style={{
                  width: selectedScene.width * zoom,
                  height: selectedScene.height * zoom,
                }}
              >
                <div
                  ref={boardRef}
                  className={`map-board ${sceneBackgroundObjectUrl ? "with-background" : ""} ${
                    dragTokenId ? "is-dragging" : ""
                  }`}
                  onPointerMove={handleBoardPointerMove}
                  onPointerUp={handleBoardPointerUp}
                  onPointerCancel={() => setDragTokenId("")}
                  style={{
                    width: selectedScene.width,
                    height: selectedScene.height,
                    backgroundSize: `${selectedScene.grid_size}px ${selectedScene.grid_size}px`,
                    transform: `scale(${zoom})`,
                  }}
                >
                  {sceneBackgroundObjectUrl && (
                    <img
                      alt=""
                      aria-hidden="true"
                      className="map-background-image"
                      src={sceneBackgroundObjectUrl}
                    />
                  )}

                  {sceneTokens.map((token) => {
                    const position = draftPositions[token.id] ?? { x: token.x, y: token.y };

                    return (
                      <button
                        className={`map-token ${selectedTokenId === token.id ? "selected" : ""} ${
                          dragTokenId === token.id ? "dragging" : ""
                        }`}
                        key={token.id}
                        onClick={() => setSelectedTokenId(token.id)}
                        onPointerDown={(event) => handleTokenPointerDown(event, token)}
                        style={{
                          left: position.x,
                          top: position.y,
                          width: token.size * selectedScene.grid_size,
                          height: token.size * selectedScene.grid_size,
                          background: token.color,
                        }}
                        title={`${token.name} (${token.x}, ${token.y})`}
                        type="button"
                      >
                        {token.name.slice(0, 2).toUpperCase()}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div className="empty-state compact-empty">
              <Castle aria-hidden="true" />
              <p>Aucune scène. Crée ou sélectionne une scène.</p>
            </div>
          )}
        </section>

        <section className="vtt-control-panel">
          {selectedScene && (
            <div data-vtt-panel="minimap" data-floating-widget="minimap" data-floating-title="Mini-map" className="map-overview">
              <div className="map-overview-header">
                <span>Mini-map</span>
                <small>
                  {sceneTokens.length} token(s) · zoom {zoomPercent}%
                </small>
              </div>

              <button
                className="map-overview-map"
                type="button"
                onClick={centerMapFromOverview}
                aria-label="Recentrer la carte depuis la mini-map"
                style={{ aspectRatio: `${selectedScene.width} / ${selectedScene.height}` }}
              >
                {sceneBackgroundObjectUrl && (
                  <img
                    alt=""
                    aria-hidden="true"
                    className="map-overview-background"
                    src={sceneBackgroundObjectUrl}
                  />
                )}

                <span
                  className="map-overview-viewport"
                  style={{
                    left: `${viewportRatio.left * 100}%`,
                    top: `${viewportRatio.top * 100}%`,
                    width: `${viewportRatio.width * 100}%`,
                    height: `${viewportRatio.height * 100}%`,
                  }}
                />

                {sceneTokens.map((token) => (
                  <span
                    className={`map-overview-token ${selectedTokenId === token.id ? "selected" : ""}`}
                    key={token.id}
                    style={{
                      left: `${clamp(token.x / selectedScene.width, 0, 1) * 100}%`,
                      top: `${clamp(token.y / selectedScene.height, 0, 1) * 100}%`,
                      background: token.color,
                    }}
                    title={token.name}
                  />
                ))}
              </button>
            </div>
          )}
          <section data-vtt-panel="token-detail" data-floating-widget="token-detail" data-floating-title="Détail token" className="token-detail-panel">
            <div className="token-detail-heading">
              <h4>Token selectionne</h4>
              {selectedToken && <span>{selectedToken.name}</span>}
            </div>

            {selectedToken && selectedTokenPosition ? (
              <>
                <div className="token-detail-grid">
                  <span>
                    <small>Nom</small>
                    <strong>{selectedToken.name}</strong>
                  </span>

                  <span>
                    <small>Personnage</small>
                    <strong>{selectedTokenCharacter?.name ?? "Token libre"}</strong>
                  </span>

                  <span>
                    <small>Position</small>
                    <strong>
                      x {selectedTokenPosition.x} · y {selectedTokenPosition.y}
                    </strong>
                  </span>

                  <span>
                    <small>Taille</small>
                    <strong>{selectedToken.size} case(s)</strong>
                  </span>

                  <span>
                    <small>Visibilite</small>
                    <strong>{selectedToken.is_hidden ? "Cache" : "Visible"}</strong>
                  </span>

                  <span>
                    <small>Couleur</small>
                    <strong>{selectedToken.color}</strong>
                  </span>
                </div>

                <div className="token-detail-actions">
                  <button className="ghost-button" type="button" onClick={centerSelectedToken}>
                    Centrer
                  </button>

                  <button
                    className="ghost-button"
                    type="button"
                    onClick={() => setSelectedTokenId("")}
                  >
                    Deselectionner
                  </button>
                </div>

                <div className="token-detail-nudge" aria-label={`Deplacer ${selectedToken.name}`}>
                  <button type="button" onClick={() => nudgeSelectedToken(0, -(selectedScene?.grid_size ?? 50))}>
                    ↑
                  </button>
                  <button type="button" onClick={() => nudgeSelectedToken(-(selectedScene?.grid_size ?? 50), 0)}>
                    ←
                  </button>
                  <button type="button" onClick={() => nudgeSelectedToken(selectedScene?.grid_size ?? 50, 0)}>
                    →
                  </button>
                  <button type="button" onClick={() => nudgeSelectedToken(0, selectedScene?.grid_size ?? 50)}>
                    ↓
                  </button>
                </div>
              </>
            ) : (
              <p className="muted">Selectionne un token sur la carte ou dans la liste.</p>
            )}
          </section>
          <details data-vtt-panel="visibility-inspector" data-floating-widget="visibility-inspector" data-floating-title="Visibilité"
           
           
           
            className="tool-card visibility-inspector-card"
            open
          >
            <summary>Visibilité</summary>

            <VisibilityInspectorPanel
              selectedScene={selectedScene}
              selectedToken={selectedToken}
              sceneTokens={sceneTokens}
            />
          </details>


          <details data-vtt-panel="quick-actions" data-floating-widget="quick-actions" data-floating-title="Actions rapides"
           
           
           
            className="tool-card quick-actions-card"
            open
          >
            <summary>Actions rapides</summary>

            <QuickActionsPanel
              selectedScene={selectedScene}
              selectedToken={selectedToken}
              sceneTokens={sceneTokens}
            />
          </details>


          <details data-vtt-panel="initiative" data-floating-widget="initiative" data-floating-title="Initiative"
           
           
           
            className="tool-card initiative-card"
            open
          >
            <summary>Initiative</summary>

            <InitiativePanel
              sceneId={selectedScene?.id ?? ""}
              sceneTokens={sceneTokens}
            />
          </details>


          <details data-vtt-panel="party-summary" data-floating-widget="party-summary" data-floating-title="Résumé du groupe"
           
           
           
            className="tool-card party-summary-card"
            open
          >
            <summary>Résumé du groupe</summary>

            <div className="party-summary-panel">
              {characters.length === 0 ? (
                <p className="muted">Aucun personnage dans cette campagne.</p>
              ) : (
                <div className="party-summary-list">
                  {characters.map((character) => {
                    const hpPercent = getHpPercent(character);

                    return (
                      <article
                        className={`party-summary-row ${selectedCharacter?.id === character.id ? "selected" : ""}`}
                        key={character.id}
                      >
                        <header>
                          <span>
                            <strong>{character.name}</strong>
                            <small>
                              Niv. {character.level} {character.class_name || "Aventurier"}
                            </small>
                          </span>

                          <b>{hpPercent}%</b>
                        </header>

                        <div className="party-summary-stats">
                          <em title="Points de vie">
                            PV {character.hp_current}/{character.hp_max}
                          </em>
                          <em title="Classe d’armure">CA {character.armor_class}</em>
                          <em title="Vitesse">VIT {character.speed}</em>
                          <em title="Perception passive estimée">
                            PP {getPassivePerception(character)}
                          </em>
                        </div>

                        <div className="party-summary-health" aria-label={`PV ${hpPercent}%`}>
                          <i style={{ width: `${hpPercent}%` }} />
                        </div>

                        {character.notes && (
                          <small className="party-summary-note">
                            {character.notes}
                          </small>
                        )}
                      </article>
                    );
                  })}
                </div>
              )}
            </div>
          </details>


          <details data-vtt-panel="gm-notes" data-floating-widget="gm-notes" data-floating-title="Notes MJ" className="tool-card" open>
            <summary>Notes MJ</summary>

            <div className="gm-notes-panel">
              <label>
                Notes privées de scène
                <textarea
                  maxLength={8000}
                  onChange={handleGmNotesChange}
                  placeholder="Secrets, rappels, indices à donner, ambiance, pièges, improvisation..."
                  rows={8}
                  value={gmNotes}
                />
              </label>

              <small>
                Notes locales privées pour cette scène. Version backend et partage co-MJ prévus plus tard.
              </small>
            </div>
          </details>



          <details data-vtt-panel="scene" data-floating-widget="scene" data-floating-title="Scènes" className="tool-card" open>
            <summary>Scene</summary>

            <form className="scene-form" onSubmit={onCreateScene}>
              <h4>Nouvelle scene</h4>

              <label>
                Nom
                <input name="name" minLength={2} maxLength={120} placeholder="Salle du donjon" required />
              </label>

              <label>
                Description
                <textarea name="description" rows={2} maxLength={2000} />
              </label>

              <div className="mini-grid three">
                <label>
                  Grille
                  <input name="grid_size" type="number" min={16} max={200} defaultValue={50} />
                </label>

                <label>
                  Largeur
                  <input name="width" type="number" min={200} max={10000} defaultValue={1200} />
                </label>

                <label>
                  Hauteur
                  <input name="height" type="number" min={200} max={10000} defaultValue={800} />
                </label>
              </div>

              <button className="ghost-button" disabled={isBusy} type="submit">
                Creer scene
              </button>
            </form>
          </details>

          <details data-vtt-panel="upload-map" data-floating-widget="upload-map" data-floating-title="Upload carte" className="tool-card">
            <summary>Uploader une carte</summary>

            <form className="asset-form" onSubmit={onUploadAsset}>
              <h4>Fond de carte</h4>

              <label>
                Uploader une image
                <input accept="image/png,image/jpeg,image/webp,image/gif" name="file" type="file" />
              </label>

              <button className="ghost-button" disabled={isBusy} type="submit">
                Uploader carte
              </button>
            </form>
          </details>

          <details data-vtt-panel="background" data-floating-widget="background" data-floating-title="Fond de carte" className="tool-card">
            <summary>Choisir le fond</summary>

            <div className="asset-picker">
              <h4>Assets de campagne</h4>

              {assets.length === 0 ? (
                <p className="muted">Aucune carte uploadee.</p>
              ) : (
                <>
                  <label>
                    Image
                    <select value={selectedAssetId} onChange={(event) => onSelectAsset(event.target.value)}>
                      {assets.map((asset) => (
                        <option key={asset.id} value={asset.id}>
                          {asset.name}
                        </option>
                      ))}
                    </select>
                  </label>

                  <button
                    className="ghost-button"
                    disabled={isBusy || !selectedScene || !selectedAssetId}
                    onClick={onSetSceneBackground}
                    type="button"
                  >
                    Utiliser comme fond
                  </button>
                </>
              )}
            </div>
          </details>

          <details data-vtt-panel="token" data-floating-widget="token" data-floating-title="Ajout token" className="tool-card" open>
            <summary>Ajouter un token</summary>

            <form className="token-form" onSubmit={onCreateToken}>
              <h4>Nouveau token</h4>

              <label>
                Personnage
                <select name="character_id" defaultValue={selectedCharacter?.id ?? ""}>
                  <option value="">Token libre</option>
                  {characters.map((character) => (
                    <option key={character.id} value={character.id}>
                      {character.name}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Nom du token
                <input name="name" maxLength={120} placeholder={selectedCharacter?.name ?? "Gobelin"} />
              </label>

              <div className="mini-grid three">
                <label>
                  X
                  <input name="x" type="number" min={0} defaultValue={100} />
                </label>

                <label>
                  Y
                  <input name="y" type="number" min={0} defaultValue={100} />
                </label>

                <label>
                  Taille
                  <input name="size" type="number" min={1} max={8} defaultValue={1} />
                </label>
              </div>

              <label>
                Couleur
                <input name="color" defaultValue="#7c3aed" />
              </label>

              <button className="primary-button" disabled={isBusy || !selectedScene} type="submit">
                Ajouter token
              </button>
            </form>
          </details>

          <details data-vtt-panel="tokens" data-floating-widget="tokens" data-floating-title="Liste tokens" className="tool-card" open>
            <summary>Tokens sur la scene</summary>

            <div className="token-list">
              <h4>Tokens</h4>

              {sceneTokens.length === 0 ? (
                <p className="muted">Aucun token sur cette scene.</p>
              ) : (
                sceneTokens.map((token) => {
                  const step = selectedScene?.grid_size ?? 50;

                  return (
                    <article
                      className={`token-row ${selectedTokenId === token.id ? "selected" : ""}`}
                      key={token.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => setSelectedTokenId(token.id)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          setSelectedTokenId(token.id);
                        }
                      }}
                    >
                      <span>
                        <strong>{token.name}</strong>
                        <small>
                          x {token.x} - y {token.y}
                        </small>
                      </span>

                      <div className="token-move-grid" aria-label={`Deplacer ${token.name}`}>
                        <button type="button" onClick={() => onMoveToken(token, 0, -step)}>
                          ↑
                        </button>
                        <button type="button" onClick={() => onMoveToken(token, -step, 0)}>
                          ←
                        </button>
                        <button type="button" onClick={() => onMoveToken(token, step, 0)}>
                          →
                        </button>
                        <button type="button" onClick={() => onMoveToken(token, 0, step)}>
                          ↓
                        </button>
                      </div>
                    </article>
                  );
                })
              )}
            </div>
          </details>
        </section>
      </div>
    </div>
  );
}
