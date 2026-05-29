import { useEffect, useMemo, useRef, useState, type FormEvent, type MouseEvent, type PointerEvent } from "react";
import { Castle, Crosshair, Minus, Plus, RotateCcw, Swords } from "lucide-react";

import type { Asset, Character, Scene, SceneToken } from "../api/types";

type Position = {
  x: number;
  y: number;
};

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
};

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
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

  const zoomPercent = Math.round(zoom * 100);

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

  function resetMapView() {
    setZoom(1);
    setPanMode(false);

    if (scrollRef.current) {
      scrollRef.current.scrollLeft = 0;
      scrollRef.current.scrollTop = 0;
    }
  }

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
    <div className="vtt-section">
      <div className="section-heading">
        <h3>Table virtuelle</h3>
        <Swords aria-hidden="true" />
      </div>

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
              Reset
            </button>

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
              <p>Aucune scene. Cree la premiere carte de combat.</p>
            </div>
          )}
        </section>

        <section className="vtt-control-panel">
          {selectedScene && (
            <div className="map-overview">
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
          <section className="token-detail-panel" data-quick-panel="token-detail">
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

          <details className="tool-card" data-quick-panel="scene" open>
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

          <details className="tool-card">
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

          <details className="tool-card">
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

          <details className="tool-card" data-quick-panel="token" open>
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

          <details className="tool-card" data-quick-panel="tokens" open>
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
