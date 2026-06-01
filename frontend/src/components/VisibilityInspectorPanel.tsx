import { useMemo, useState } from "react";
import { Eye, EyeOff } from "lucide-react";

import type { Scene, SceneToken } from "../api/types";
import { showFloatingWidget } from "../hooks/useFloatingWidgets";

type VisibilityInspectorPanelProps = {
  selectedScene: Scene | undefined;
  selectedToken: SceneToken | undefined;
  sceneTokens: SceneToken[];
  isBusy: boolean;
  onToggleTokenVisibility: (token: SceneToken) => void;
  onRevealAllTokens: () => void;
  onHideAllTokens: () => void;
};

type VisibilityFilter = "all" | "visible" | "hidden";

export function VisibilityInspectorPanel({
  selectedScene,
  selectedToken,
  sceneTokens,
  isBusy,
  onToggleTokenVisibility,
  onRevealAllTokens,
  onHideAllTokens,
}: VisibilityInspectorPanelProps) {
  const [filter, setFilter] = useState<VisibilityFilter>("all");

  const visibleTokens = useMemo(
    () => sceneTokens.filter((token) => !token.is_hidden),
    [sceneTokens],
  );

  const hiddenTokens = useMemo(
    () => sceneTokens.filter((token) => token.is_hidden),
    [sceneTokens],
  );

  const filteredTokens = useMemo(() => {
    if (filter === "visible") return visibleTokens;
    if (filter === "hidden") return hiddenTokens;
    return sceneTokens;
  }, [filter, hiddenTokens, sceneTokens, visibleTokens]);

  const playerVisiblePercent =
    sceneTokens.length > 0
      ? Math.round((visibleTokens.length / sceneTokens.length) * 100)
      : 0;

  function copyVisibilitySummary() {
    const summary = [
      selectedScene ? `Scène active : ${selectedScene.name}` : "Aucune scène active",
      `Tokens visibles : ${visibleTokens.length}`,
      `Tokens cachés : ${hiddenTokens.length}`,
      selectedToken
        ? `Token sélectionné : ${selectedToken.name} (${selectedToken.is_hidden ? "caché" : "visible"})`
        : "Aucun token sélectionné",
    ].join("\n");

    void navigator.clipboard?.writeText(summary);
  }

  return (
    <div className="visibility-inspector-panel">
      {/* Overview */}
      <section className="visibility-inspector-overview">
        <article>
          <span>Scène</span>
          <strong>{selectedScene?.name ?? "Aucune"}</strong>
        </article>
        <article>
          <span>Visible joueurs</span>
          <strong>{playerVisiblePercent}%</strong>
        </article>
        <article>
          <span>Tokens visibles</span>
          <strong>{visibleTokens.length}</strong>
        </article>
        <article>
          <span>Tokens cachés</span>
          <strong>{hiddenTokens.length}</strong>
        </article>
      </section>

      {/* Bulk actions */}
      <section className="visibility-bulk-actions">
        <button
          className="ghost-button"
          disabled={isBusy || sceneTokens.length === 0}
          onClick={onRevealAllTokens}
          type="button"
        >
          <Eye size={14} aria-hidden="true" /> Tout reveler
        </button>
        <button
          className="ghost-button"
          disabled={isBusy || sceneTokens.length === 0}
          onClick={onHideAllTokens}
          type="button"
        >
          <EyeOff size={14} aria-hidden="true" /> Tout cacher
        </button>
      </section>

      {/* Selected token */}
      <section className="visibility-selected-token">
        <strong>Token selectionne</strong>

        {selectedToken ? (
          <div className={selectedToken.is_hidden ? "visibility-token-card hidden" : "visibility-token-card"}>
            <span>
              <b>{selectedToken.name}</b>
              <small>{selectedToken.is_hidden ? "Cache aux joueurs" : "Visible par les joueurs"}</small>
            </span>
            <button
              className="ghost-button compact"
              disabled={isBusy}
              onClick={() => onToggleTokenVisibility(selectedToken)}
              type="button"
              title={selectedToken.is_hidden ? "Reveler" : "Cacher"}
            >
              {selectedToken.is_hidden ? <Eye size={14} /> : <EyeOff size={14} />}
            </button>
          </div>
        ) : (
          <p className="muted">Aucun token selectionne.</p>
        )}
      </section>

      {/* Alerts */}
      <section className="visibility-alerts">
        <strong>Alertes MJ</strong>

        {sceneTokens.length === 0 ? (
          <p className="muted">Aucun token sur cette scene.</p>
        ) : (
          <ul>
            {hiddenTokens.length > 0 && (
              <li>{hiddenTokens.length} token(s) encore cache(s) aux joueurs.</li>
            )}
            {visibleTokens.length === sceneTokens.length && sceneTokens.length > 0 && (
              <li>Tous les tokens de la scene sont visibles.</li>
            )}
            {selectedToken?.is_hidden && (
              <li>Le token selectionne est cache : attention avant de le decrire publiquement.</li>
            )}
          </ul>
        )}
      </section>

      {/* Filter */}
      <section>
        <strong>Filtrer les tokens</strong>

        <div className="visibility-filter-buttons">
          <button className={filter === "all" ? "active" : ""} onClick={() => setFilter("all")} type="button">
            Tous
          </button>
          <button className={filter === "visible" ? "active" : ""} onClick={() => setFilter("visible")} type="button">
            Visibles
          </button>
          <button className={filter === "hidden" ? "active" : ""} onClick={() => setFilter("hidden")} type="button">
            Caches
          </button>
        </div>
      </section>

      {/* Token list */}
      <section className="visibility-token-list">
        <strong>Tokens de scene</strong>

        {filteredTokens.length === 0 ? (
          <p className="muted">Aucun token pour ce filtre.</p>
        ) : (
          <div>
            {filteredTokens.map((token) => (
              <article className={token.is_hidden ? "hidden" : ""} key={token.id}>
                <span>
                  <b>{token.name}</b>
                  <small>
                    x {token.x} · y {token.y} · taille {token.size}
                  </small>
                </span>
                <div className="visibility-token-actions">
                  <em>{token.is_hidden ? "Cache" : "Visible"}</em>
                  <button
                    className="ghost-button compact"
                    disabled={isBusy}
                    onClick={() => onToggleTokenVisibility(token)}
                    type="button"
                    title={token.is_hidden ? "Reveler" : "Cacher"}
                  >
                    {token.is_hidden ? <Eye size={14} /> : <EyeOff size={14} />}
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {/* Shortcuts */}
      <section>
        <strong>Raccourcis</strong>
        <div className="visibility-actions">
          <button onClick={() => showFloatingWidget("token-detail")} type="button">
            Detail token
          </button>
          <button onClick={() => showFloatingWidget("gm-notes")} type="button">
            Notes MJ
          </button>
          <button onClick={() => showFloatingWidget("minimap")} type="button">
            Mini-map
          </button>
          <button onClick={copyVisibilitySummary} type="button">
            Copier resume
          </button>
        </div>
      </section>
    </div>
  );
}
