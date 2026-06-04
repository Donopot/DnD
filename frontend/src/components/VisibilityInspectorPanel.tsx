import { Eye, EyeOff } from "lucide-react";
import { useMemo, useState } from "react";

import type { Scene, SceneToken } from "../api/types";

type VisibilityInspectorPanelProps = {
  selectedScene: Scene | undefined;
  selectedToken: SceneToken | undefined;
  sceneTokens: SceneToken[];
  isGM: boolean;
  /** Callback to toggle is_hidden on a token (calls PATCH /api/tokens/{id}) */
  onToggleTokenHidden?: (token: SceneToken) => void;
  /** Number of tokens hidden by fog of war (optional) */
  fogHiddenCount?: number;
  /** Callback pour ouvrir un panneau en fenêtre flottante. */
  onOpenPanel?: (panelId: string) => void;
};

type VisibilityFilter = "all" | "visible" | "hidden";

export function VisibilityInspectorPanel({
  selectedScene,
  selectedToken,
  sceneTokens,
  isGM,
  onToggleTokenHidden,
  fogHiddenCount = 0,
  onOpenPanel,
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
      `Tokens cachés (flag) : ${hiddenTokens.length}`,
      fogHiddenCount > 0 ? `Tokens cachés par le brouillard : ${fogHiddenCount}` : null,
      selectedToken
        ? `Token sélectionné : ${selectedToken.name} (${selectedToken.is_hidden ? "caché" : "visible"})`
        : "Aucun token sélectionné",
    ]
      .filter(Boolean)
      .join("\n");

    void navigator.clipboard?.writeText(summary);
  }

  if (!isGM) {
    return (
      <div className="gm-panel-content">
        <p className="gm-panel-muted">Fonctionnalité réservée au MJ.</p>
      </div>
    );
  }

  return (
    <div className="gm-panel-content visibility-inspector-panel" data-vtt-panel>
      <section className="gm-panel-section">
        <header className="gm-panel-section-header">
          <strong>Vue d'ensemble</strong>
        </header>

        <div className="gm-panel-context">
          <span className="gm-panel-stat">
            <small>Scène</small>
            <strong>{selectedScene?.name ?? "Aucune"}</strong>
          </span>

          <span className="gm-panel-stat">
            <small>Non cachés</small>
            <strong>{playerVisiblePercent}%</strong>
          </span>

          <span className="gm-panel-stat">
            <small>Visibles</small>
            <strong>{visibleTokens.length}</strong>
          </span>

          <span className="gm-panel-stat">
            <small>Cachés</small>
            <strong>{hiddenTokens.length}</strong>
          </span>

          {fogHiddenCount > 0 && (
            <span className="gm-panel-stat">
              <small>Brouillard</small>
              <strong>{fogHiddenCount} caché(s)</strong>
            </span>
          )}
        </div>
      </section>

      <section className="gm-panel-section">
        <header className="gm-panel-section-header">
          <strong>Token sélectionné</strong>
        </header>

        {selectedToken ? (
          <div
            className={
              selectedToken.is_hidden ? "visibility-token-card hidden" : "visibility-token-card"
            }
          >
            <span>
              <b>{selectedToken.name}</b>
              <small>
                {selectedToken.is_hidden ? "Caché aux joueurs" : "Visible par les joueurs"}
              </small>
            </span>

            {onToggleTokenHidden && (
              <button
                type="button"
                className="visibility-toggle-btn"
                onClick={() => onToggleTokenHidden(selectedToken)}
                title={selectedToken.is_hidden ? "Révéler aux joueurs" : "Cacher aux joueurs"}
              >
                {selectedToken.is_hidden ? (
                  <>
                    <Eye size={14} /> Révéler
                  </>
                ) : (
                  <>
                    <EyeOff size={14} /> Cacher
                  </>
                )}
              </button>
            )}
          </div>
        ) : (
          <p className="gm-panel-muted">Aucun token sélectionné.</p>
        )}
      </section>

      <section className="gm-panel-section">
        <header className="gm-panel-section-header">
          <strong>Alertes MJ</strong>
        </header>

        {sceneTokens.length === 0 ? (
          <p className="gm-panel-muted">Aucun token sur cette scène.</p>
        ) : (
          <ul className="visibility-alerts">
            {hiddenTokens.length > 0 && (
              <li>{hiddenTokens.length} token(s) encore caché(s) aux joueurs.</li>
            )}
            {visibleTokens.length === sceneTokens.length &&
              sceneTokens.length > 0 &&
              fogHiddenCount === 0 && (
                <li>Tous les tokens de la scène sont visibles.</li>
              )}
            {selectedToken?.is_hidden && (
              <li>
                Le token sélectionné est caché : attention avant de le décrire publiquement.
              </li>
            )}
            {fogHiddenCount > 0 && (
              <li>
                {fogHiddenCount} token(s) masqué(s) par le brouillard de guerre.
              </li>
            )}
          </ul>
        )}
      </section>

      <section className="gm-panel-section">
        <header className="gm-panel-section-header">
          <strong>Filtrer les tokens</strong>
        </header>

        <div className="gm-panel-actions three">
          <button
            className={filter === "all" ? "active" : ""}
            onClick={() => setFilter("all")}
            type="button"
          >
            Tous
          </button>
          <button
            className={filter === "visible" ? "active" : ""}
            onClick={() => setFilter("visible")}
            type="button"
          >
            Visibles
          </button>
          <button
            className={filter === "hidden" ? "active" : ""}
            onClick={() => setFilter("hidden")}
            type="button"
          >
            Cachés
          </button>
        </div>
      </section>

      <section className="gm-panel-section">
        <header className="gm-panel-section-header">
          <strong>Tokens de scène</strong>
        </header>

        {filteredTokens.length === 0 ? (
          <p className="gm-panel-muted">Aucun token pour ce filtre.</p>
        ) : (
          <div className="gm-panel-list visibility-token-list">
            {filteredTokens.map((token) => (
              <article
                className={`gm-panel-row ${token.is_hidden ? "hidden" : ""}`}
                key={token.id}
              >
                <header>
                  <span>
                    <strong>{token.name}</strong>
                    <small>
                      x {token.x} · y {token.y} · taille {token.size}
                    </small>
                  </span>

                  {onToggleTokenHidden ? (
                    <button
                      type="button"
                      className="visibility-toggle-btn"
                      onClick={() => onToggleTokenHidden(token)}
                      title={token.is_hidden ? "Révéler" : "Cacher"}
                    >
                      {token.is_hidden ? (
                        <>
                          <Eye size={12} /> Révéler
                        </>
                      ) : (
                        <>
                          <EyeOff size={12} /> Cacher
                        </>
                      )}
                    </button>
                  ) : (
                    <em className="gm-panel-muted">{token.is_hidden ? "Caché" : "Visible"}</em>
                  )}
                </header>
              </article>
            ))}
          </div>
        )}
      </section>

      {onToggleTokenHidden && (
        <section className="gm-panel-section">
          <header className="gm-panel-section-header">
            <strong>Actions groupées</strong>
          </header>

          <div className="gm-panel-actions">
            <button
              type="button"
              onClick={() => hiddenTokens.forEach((t) => onToggleTokenHidden(t))}
              disabled={hiddenTokens.length === 0}
            >
              <Eye size={14} /> Révéler tous
            </button>
            <button
              type="button"
              onClick={() => visibleTokens.forEach((t) => onToggleTokenHidden(t))}
              disabled={visibleTokens.length === 0}
            >
              <EyeOff size={14} /> Cacher tous
            </button>
          </div>
        </section>
      )}

      <section className="gm-panel-section">
        <header className="gm-panel-section-header">
          <strong>Raccourcis</strong>
        </header>

        <div className="gm-panel-actions">
          <button onClick={() => onOpenPanel?.("token-detail")} type="button">
            Détail token
          </button>

          <button onClick={() => onOpenPanel?.("gm-notes")} type="button">
            Notes MJ
          </button>

          <button onClick={() => onOpenPanel?.("session-log")} type="button">
            Journal
          </button>

          <button onClick={copyVisibilitySummary} type="button">
            Copier résumé
          </button>
        </div>
      </section>
    </div>
  );
}
