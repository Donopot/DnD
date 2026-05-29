import type { FormEvent } from "react";
import { Castle, Swords } from "lucide-react";

import type { Asset, Character, Scene, SceneToken } from "../api/types";

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

          {selectedScene ? (
            <div className="map-scroll">
              <div
                className={`map-board ${sceneBackgroundObjectUrl ? "with-background" : ""}`}
                style={{
                  width: selectedScene.width,
                  height: selectedScene.height,
                  backgroundSize: `${selectedScene.grid_size}px ${selectedScene.grid_size}px`,
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

                {sceneTokens.map((token) => (
                  <button
                    className="map-token"
                    key={token.id}
                    style={{
                      left: token.x,
                      top: token.y,
                      width: token.size * selectedScene.grid_size,
                      height: token.size * selectedScene.grid_size,
                      background: token.color,
                    }}
                    title={`${token.name} (${token.x}, ${token.y})`}
                    type="button"
                  >
                    {token.name.slice(0, 2).toUpperCase()}
                  </button>
                ))}
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
                  <article className="token-row" key={token.id}>
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
