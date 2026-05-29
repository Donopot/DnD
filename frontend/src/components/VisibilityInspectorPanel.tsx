import { useMemo, useState } from "react";

import type { Scene, SceneToken } from "../api/types";
import { showFloatingWidget } from "../hooks/useFloatingWidgets";

type VisibilityInspectorPanelProps = {
  selectedScene: Scene | undefined;
  selectedToken: SceneToken | undefined;
  sceneTokens: SceneToken[];
};

type VisibilityFilter = "all" | "visible" | "hidden";

export function VisibilityInspectorPanel({
  selectedScene,
  selectedToken,
  sceneTokens,
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
    if (filter === "visible") {
      return visibleTokens;
    }

    if (filter === "hidden") {
      return hiddenTokens;
    }

    return sceneTokens;
  }, [filter, hiddenTokens, sceneTokens, visibleTokens]);

  const playerVisiblePercent = sceneTokens.length > 0
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

      <section className="visibility-selected-token">
        <strong>Token sélectionné</strong>

        {selectedToken ? (
          <div className={selectedToken.is_hidden ? "visibility-token-card hidden" : "visibility-token-card"}>
            <span>
              <b>{selectedToken.name}</b>
              <small>{selectedToken.is_hidden ? "Caché aux joueurs" : "Visible par les joueurs"}</small>
            </span>

            <em>{selectedToken.is_hidden ? "MJ" : "Public"}</em>
          </div>
        ) : (
          <p className="muted">Aucun token sélectionné.</p>
        )}
      </section>

      <section className="visibility-alerts">
        <strong>Alertes MJ</strong>

        {sceneTokens.length === 0 ? (
          <p className="muted">Aucun token sur cette scène.</p>
        ) : (
          <ul>
            {hiddenTokens.length > 0 && (
              <li>{hiddenTokens.length} token(s) encore caché(s) aux joueurs.</li>
            )}
            {visibleTokens.length === sceneTokens.length && sceneTokens.length > 0 && (
              <li>Tous les tokens de la scène sont visibles.</li>
            )}
            {selectedToken?.is_hidden && (
              <li>Le token sélectionné est caché : attention avant de le décrire publiquement.</li>
            )}
          </ul>
        )}
      </section>

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
            Cachés
          </button>
        </div>
      </section>

      <section className="visibility-token-list">
        <strong>Tokens de scène</strong>

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

                <em>{token.is_hidden ? "Caché" : "Visible"}</em>
              </article>
            ))}
          </div>
        )}
      </section>

      <section>
        <strong>Raccourcis</strong>

        <div className="visibility-actions">
          <button onClick={() => showFloatingWidget("token-detail")} type="button">
            Détail token
          </button>

          <button onClick={() => showFloatingWidget("gm-notes")} type="button">
            Notes MJ
          </button>

          <button onClick={() => showFloatingWidget("minimap")} type="button">
            Mini-map
          </button>

          <button onClick={copyVisibilitySummary} type="button">
            Copier résumé
          </button>
        </div>
      </section>

      <footer>
        <small>
          Modification directe de visibilité prévue dans une prochaine phase avec backend.
        </small>
      </footer>
    </div>
  );
}
