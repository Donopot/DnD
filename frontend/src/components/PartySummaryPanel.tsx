import type { Character } from "../api/types";

type PartySummaryPanelProps = {
  characters: Character[];
  selectedCharacter: Character | undefined;
};

function getAbilityModifier(score: number) {
  return Math.floor((score - 10) / 2);
}

function getPassivePerception(character: Character) {
  return 10 + getAbilityModifier(character.attributes?.wis ?? 10);
}

function getHpPercent(character: Character) {
  if (character.hp_max <= 0) {
    return 0;
  }

  return Math.max(0, Math.min(100, Math.round((character.hp_current / character.hp_max) * 100)));
}

function getHealthLabel(percent: number) {
  if (percent <= 0) {
    return "KO";
  }

  if (percent <= 25) {
    return "Critique";
  }

  if (percent <= 50) {
    return "Blessé";
  }

  return "OK";
}

export function PartySummaryPanel({ characters, selectedCharacter }: PartySummaryPanelProps) {
  if (characters.length === 0) {
    return (
      <div className="gm-panel-content party-summary-panel">
        <section className="gm-panel-section">
          <header>
            <strong>Résumé du groupe</strong>
            <small>Aucun personnage</small>
          </header>

          <p className="gm-panel-muted">Aucun personnage dans cette campagne.</p>
        </section>
      </div>
    );
  }

  const woundedCharacters = characters.filter((character) => character.hp_current < character.hp_max);
  const downCharacters = characters.filter((character) => character.hp_current <= 0);

  return (
    <div className="gm-panel-content party-summary-panel">
      <section className="gm-panel-context three">
        <span className="gm-panel-stat">
          <small>Groupe</small>
          <strong>{characters.length}</strong>
        </span>

        <span className="gm-panel-stat">
          <small>Blessés</small>
          <strong>{woundedCharacters.length}</strong>
        </span>

        <span className="gm-panel-stat">
          <small>KO</small>
          <strong>{downCharacters.length}</strong>
        </span>
      </section>

      <section className="gm-panel-section">
        <header>
          <strong>Personnages</strong>
          <small>PV, CA, vitesse, perception passive</small>
        </header>

        <div className="gm-panel-list">
          {characters.map((character) => {
            const hpPercent = getHpPercent(character);
            const healthLabel = getHealthLabel(hpPercent);
            const isSelected = selectedCharacter?.id === character.id;
            const isDanger = hpPercent <= 25;

            return (
              <article
                className={`gm-panel-row ${isSelected ? "selected" : ""} ${isDanger ? "danger" : ""}`}
                key={character.id}
              >
                <header>
                  <span>
                    <strong>{character.name}</strong>
                    <small>
                      Niv. {character.level} · {character.class_name || "Aventurier"}
                    </small>
                  </span>

                  <b className={`gm-panel-badge ${isDanger ? "danger" : ""}`}>{healthLabel}</b>
                </header>

                <div className="gm-panel-grid four">
                  <span className="gm-panel-stat">
                    <small>PV</small>
                    <strong>
                      {character.hp_current}/{character.hp_max}
                    </strong>
                  </span>

                  <span className="gm-panel-stat">
                    <small>CA</small>
                    <strong>{character.armor_class}</strong>
                  </span>

                  <span className="gm-panel-stat">
                    <small>Vitesse</small>
                    <strong>{character.speed}</strong>
                  </span>

                  <span className="gm-panel-stat">
                    <small>Perception</small>
                    <strong>{getPassivePerception(character)}</strong>
                  </span>
                </div>

                <div className={`gm-panel-progress ${isDanger ? "danger" : ""}`} aria-label={`PV ${hpPercent}%`}>
                  <i style={{ width: `${hpPercent}%` }} />
                </div>

                {character.notes ? <small className="gm-panel-muted">{character.notes}</small> : null}
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}
