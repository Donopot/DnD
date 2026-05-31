import type { Character, Scene, SceneToken } from "../api/types";

type TokenPosition = {
  x: number;
  y: number;
};

type TokenDetailPanelProps = {
  selectedScene: Scene | undefined;
  selectedToken: SceneToken | undefined;
  selectedTokenCharacter: Character | undefined;
  selectedTokenPosition: TokenPosition | undefined;
  onCenterSelectedToken: () => void;
  onDeselectToken: () => void;
  onNudgeSelectedToken: (dx: number, dy: number) => void;
};

export function TokenDetailPanel({
  selectedScene,
  selectedToken,
  selectedTokenCharacter,
  selectedTokenPosition,
  onCenterSelectedToken,
  onDeselectToken,
  onNudgeSelectedToken,
}: TokenDetailPanelProps) {
  const step = selectedScene?.grid_size ?? 50;

  if (!selectedToken || !selectedTokenPosition) {
    return (
      <div className="gm-panel-content token-detail-panel-standard">
        <section className="gm-panel-section">
          <header>
            <strong>Aucune sélection</strong>
            <small>Token</small>
          </header>

          <p className="gm-panel-muted">
            Sélectionne un token sur la carte ou dans la liste pour afficher ses détails.
          </p>
        </section>
      </div>
    );
  }

  return (
    <div className="gm-panel-content token-detail-panel-standard">
      <section className="gm-panel-context">
        <span className="gm-panel-stat">
          <small>Nom</small>
          <strong>{selectedToken.name}</strong>
        </span>

        <span className="gm-panel-stat">
          <small>Personnage</small>
          <strong>{selectedTokenCharacter?.name ?? "Token libre"}</strong>
        </span>
      </section>

      <section className="gm-panel-section">
        <header>
          <strong>Position</strong>
          <small>Carte active</small>
        </header>

        <div className="gm-panel-grid four">
          <span className="gm-panel-stat">
            <small>X</small>
            <strong>{selectedTokenPosition.x}</strong>
          </span>

          <span className="gm-panel-stat">
            <small>Y</small>
            <strong>{selectedTokenPosition.y}</strong>
          </span>

          <span className="gm-panel-stat">
            <small>Taille</small>
            <strong>{selectedToken.size}</strong>
          </span>

          <span className="gm-panel-stat">
            <small>Visibilité</small>
            <strong>{selectedToken.is_hidden ? "Caché" : "Visible"}</strong>
          </span>
        </div>
      </section>

      <section className="gm-panel-section">
        <header>
          <strong>Apparence</strong>
          <small>Token</small>
        </header>

        <div className="gm-panel-card token-detail-color-card">
          <span>
            <small>Couleur</small>
            <strong>{selectedToken.color}</strong>
          </span>

          <i style={{ background: selectedToken.color }} aria-hidden="true" />
        </div>
      </section>

      <section className="gm-panel-section">
        <header>
          <strong>Actions</strong>
          <small>Token sélectionné</small>
        </header>

        <div className="gm-panel-actions grid">
          <button type="button" onClick={onCenterSelectedToken}>
            Centrer
          </button>

          <button type="button" onClick={onDeselectToken}>
            Désélectionner
          </button>
        </div>
      </section>

      <section className="gm-panel-section">
        <header>
          <strong>Déplacer</strong>
          <small>Pas de {step}px</small>
        </header>

        <div className="token-detail-nudge-grid" aria-label={`Déplacer ${selectedToken.name}`}>
          <button type="button" onClick={() => onNudgeSelectedToken(0, -step)}>
            ↑
          </button>

          <button type="button" onClick={() => onNudgeSelectedToken(-step, 0)}>
            ←
          </button>

          <button type="button" onClick={() => onNudgeSelectedToken(step, 0)}>
            →
          </button>

          <button type="button" onClick={() => onNudgeSelectedToken(0, step)}>
            ↓
          </button>
        </div>
      </section>
    </div>
  );
}
